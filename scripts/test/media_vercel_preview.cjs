'use strict';
// Deploy only a minimal protected probe. Secrets enter the CLI through its process env, never argv or source files.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const { readMediaMongoConfig } = require('../api/media_mongodb.cjs');
const dotenv = require('dotenv');

function runCli(cli, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], { windowsHide: true,
            cwd: options.cwd || process.cwd(), env: { ...process.env, NO_COLOR: '1', VERCEL_TELEMETRY_DISABLED: '1', ...options.env },
            stdio: ['pipe', 'pipe', 'pipe'] });
        let output = '';
        const timer = setTimeout(() => { child.kill(); reject(Error()); }, options.timeout || 60000);
        child.stdout.on('data', data => { if (output.length < 300000) output += data.toString(); });
        child.stderr.on('data', data => { if (output.length < 300000) output += data.toString(); });
        child.once('error', () => { clearTimeout(timer); reject(Error()); });
        child.once('close', code => { clearTimeout(timer); resolve({ code, output }); });
        child.stdin.on('error', () => {});
        child.stdin.end(options.input || '');
    });
}

async function main() {
    const imageProbe = process.argv.includes('--image');
    let stage = 'configuration', deploymentId = null, request, headerFile = null, linked;
    let originalBypasses = null, callerId = null, imageFile = null;
    const startedAt = Date.now();
    const report = { capturedAt: new Date().toISOString(), status: 'INCOMPLETE', productionChanged: false, projectEnvironmentChanged: false, mongoWrites: false };
    try {
        linked = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
        const auth = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, 'com.vercel.cli/Data/auth.json'), 'utf8'));
        if (!/^prj_[A-Za-z0-9]+$/.test(linked.projectId) || typeof auth.token !== 'string') throw Error();
        request = async (endpoint, method = 'GET', body) => {
            const response = await fetch('https://api.vercel.com' + endpoint + '?teamId=' + linked.orgId, {
                method, headers: { Authorization: 'Bearer ' + auth.token, 'Content-Type': 'application/json' },
                ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw Object.assign(new Error(), { httpStatus: response.status });
            return data;
        };
        const before = await request('/v9/projects/' + linked.projectId);
        originalBypasses = new Set(Object.keys(before.protectionBypass || {}));
        callerId = (await request('/v2/user')).user?.id || null;
        const settings = dotenv.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/atlas.private.env'));
        const config = readMediaMongoConfig(settings);
        const probeToken = randomBytes(32).toString('hex');
        const values = { MONGODB_URI: config.uri, MONGODB_DB: config.database, MONGODB_MEDIA_BUCKET: config.bucket,
            MEDIA_UPLOAD_ENABLED: 'false', MEDIA_VIDEO_ENABLED: 'false', MEDIA_PREFLIGHT_TOKEN: probeToken };
        const cache = path.join(process.env.LOCALAPPDATA, 'npm-cache/_npx');
        const candidates = fs.readdirSync(cache).map(name => path.join(cache, name, 'node_modules/vercel/package.json')).filter(file => fs.existsSync(file));
        candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
        if (!candidates.length) throw Error();
        const pkg = JSON.parse(fs.readFileSync(candidates[0], 'utf8'));
        const cli = path.resolve(path.dirname(candidates[0]), typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.vercel);
        const artifact = path.resolve('D:/Aboutme/Pawpal-infra/media/vercel-probe-' + Date.now());
        const files = [
            { file: '.vercel/project.json', data: JSON.stringify(linked) },
            { file: 'package.json', data: JSON.stringify({ private: true, dependencies: { mongodb: '6.21.0', ...(imageProbe ? {sharp:'0.34.5',busboy:'1.6.0'} : {}) } }) },
            { file: 'vercel.json', data: JSON.stringify({ framework: null, buildCommand: '', outputDirectory: '.',
                installCommand: 'npm install --ignore-scripts --no-audit --no-fund',
                functions: { 'api/media-probe.js': { maxDuration: 15 } } }) },
            { file: 'index.html', data: '<!doctype html><title>PawPal Preview probe</title><p>Temporary connectivity check.</p>' },
            { file: 'api/media-probe.js', data: imageProbe ? "module.exports=require('../scripts/test/media_vercel_upload_probe.cjs');module.exports.config={api:{bodyParser:false}};" : "module.exports=require('../scripts/test/media_vercel_probe.cjs');" },
            ...[...(imageProbe?['scripts/test/media_vercel_upload_probe.cjs','scripts/api/media_files.cjs','scripts/api/media_gridfs.cjs']:['scripts/test/media_vercel_probe.cjs']), 'scripts/api/media_mongodb.cjs'].map(file => ({ file, data: fs.readFileSync(file, 'utf8') }))
        ];
        for (const file of files) {
            const destination = path.join(artifact, file.file);
            fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, file.data);
        }
        stage = 'preview_deployment';
        console.log(JSON.stringify({ stage, status: 'STARTING', scope: 'minimal artifact; runtime env overrides only' }));
        // CLI resolves --env NAME from its process environment. No secret values in command arguments.
        const deployed = await runCli(cli, ['deploy', '--yes', '--target', 'preview', '--no-wait',
            ...Object.keys(values).flatMap(key => ['--env', key])], { cwd: artifact, env: values, timeout: 90000 });
        const urls = deployed.output.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g) || [];
        if (!urls.length) throw Error();
        report.previewUrl = urls[0];
        const deployment = await request('/v13/deployments/' + new URL(report.previewUrl).hostname);
        deploymentId = deployment.id;
        if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId || '')) throw Error();
        report.deploymentId = deploymentId;
        if (deployment.target === 'production') throw Error();
        console.log(JSON.stringify({ stage, status: 'CREATED', deploymentId }));
        stage = 'preview_build';
        let ready = false;
        for (let attempt = 0; attempt < 75; attempt++) {
            const current = await request('/v13/deployments/' + deploymentId);
            const state = current.readyState || current.status;
            if (attempt % 10 === 0) console.log(JSON.stringify({ stage, state }));
            if (state === 'READY') { ready = true; break; }
            if (['ERROR', 'CANCELED'].includes(state)) throw Error();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        if (!ready) throw Error();
        stage = 'preview_probe';
        headerFile = path.resolve('D:/Aboutme/Pawpal-infra/media/probe-header-' + randomBytes(8).toString('hex') + '.private.txt');
        fs.writeFileSync(headerFile, 'x-pawpal-media-probe: ' + probeToken + '\n', { flag: 'wx', mode: 0o600 });
        if(imageProbe){imageFile=path.resolve('D:/Aboutme/Pawpal-infra/media/probe-image-'+randomBytes(8).toString('hex')+'.private.png');await require('sharp')({create:{width:2,height:2,channels:3,background:'#236b48'}}).png().toFile(imageFile);}
        const result = await runCli(cli, ['curl', report.previewUrl + '/api/media-probe', '--', '--request', 'POST',
            ...(imageProbe?['--form','file=@'+imageFile+';type=image/png']:[]),
            '--header', '@' + headerFile, '--include', '--silent', '--show-error', '--max-time', '25', '--write-out', '\n%{http_code}'],
            { timeout: 45000 });
        const match = result.output.match(/\n(\d{3})\s*$/);
        report.probeCliExitCode = result.code;
        report.probeDiagnostics = { mentionsProtection: /protection/i.test(result.output), mentionsBypass: /bypass/i.test(result.output),
            mentionsUnknownOption: /unknown|unexpected option/i.test(result.output), mentionsCurlMissing: /curl.*not found|ENOENT/i.test(result.output),
            mentionsAuthorization: /unauthorized|forbidden|authentication|token/i.test(result.output) };
        const location = result.output.match(/^location:\s*(\S+)/im)?.[1];
        if (location) { try { report.redirectHost = new URL(location, report.previewUrl).hostname; } catch {} }
        report.probeDiagnostics.cliNotes = result.output.split(/\r?\n/).filter(line => /^(Error:|Warning:|>)/.test(line)).slice(0, 4)
            .map(line => line.replace(/https?:\/\/\S+/g, '[URL]').replace(/[A-Za-z0-9_=-]{30,}/g, '[REDACTED]').slice(0, 250));
        report.probeHttpStatus = match ? Number(match[1]) : null;
        // CLI may prefix status text. Match only our small response, never forward raw output.
        const bodyMatch = result.output.match(/\{"ok":(?:true|false)[^\r\n]*?\}/);
        let body;
        try { body = JSON.parse(bodyMatch?.[0] || 'null'); } catch { body = null; }
        report.atlasPing = report.probeHttpStatus === 200 && body?.ok === true && (imageProbe ? body.scope==='image_roundtrip'&&body.cleaned===true : body.scope === 'atlas_ping_only' && body.writes === false);
        if(imageProbe){report.mongoWrites=true;report.ownImageAndChunksRemoved=body?.cleaned===true;report.scope='multipart_sharp_gridfs_roundtrip_no_business_records';}
        report.probeCode = body?.code === 'MEDIA_PROBE_CONNECTION_FAILED' ? body.code : null;
        report.status = report.atlasPing ? 'PASS' : 'FAIL';
        if (!report.atlasPing) process.exitCode = 1;
    } catch (error) {
        report.status = 'FAIL'; report.failedStage = stage;
        report.httpStatus = Number.isInteger(error?.httpStatus) ? error.httpStatus : null;
        process.exitCode = 1;
    } finally {
        if (headerFile) { try { fs.unlinkSync(headerFile); } catch { report.privateHeaderCleanupFailed = true; } }
        if(imageFile){try{fs.unlinkSync(imageFile);}catch{report.privateImageCleanupFailed=true;}}
        if (request && deploymentId) {
            try { await request('/v13/deployments/' + deploymentId, 'DELETE'); report.probeDeploymentRemoved = true; }
            catch { report.probeDeploymentRemoved = false; process.exitCode = 1; }
        }
        if (request && originalBypasses && callerId) {
            try {
                const current = await request('/v9/projects/' + linked.projectId);
                const generated = Object.entries(current.protectionBypass || {}).filter(([key, value]) =>
                    !originalBypasses.has(key) && value.scope === 'automation-bypass' &&
                    value.createdBy === callerId && value.createdAt >= startedAt);
                if (generated.length === 1) {
                    await request('/v1/projects/' + linked.projectId + '/protection-bypass', 'PATCH', {
                        revoke: { secret: generated[0][0], regenerate: false }
                    });
                    report.temporaryAutomationBypassRevoked = true;
                } else if (generated.length > 1) {
                    report.automationBypassCleanupNeedsReview = true; process.exitCode = 1;
                }
            } catch { report.automationBypassCleanupNeedsReview = true; process.exitCode = 1; }
        }
        fs.mkdirSync('docs/media', { recursive: true });
        fs.writeFileSync(imageProbe?'docs/media/phase4-vercel-preview.txt':'docs/media/phase2-vercel-preview.txt', JSON.stringify(report, null, 2) + '\n');
        console.log(JSON.stringify(report));
    }
}
if (require.main === module) main();
module.exports = { runCli };
