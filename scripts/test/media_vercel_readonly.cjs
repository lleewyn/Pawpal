'use strict';
// Inspect linked Vercel project metadata using the existing CLI session. Never print env values/tokens.
const fs = require('node:fs');
const path = require('node:path');

async function main() {
    let stage = 'local_configuration';
    try {
        const linked = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
        const authPath = path.join(process.env.APPDATA || '', 'com.vercel.cli/Data/auth.json');
        const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        const token = auth.token;
        if (typeof token !== 'string' || !token) throw Error();
        if (!/^prj_[A-Za-z0-9]+$/.test(linked.projectId) || !/^team_[A-Za-z0-9]+$/.test(linked.orgId)) throw Error();
        const get = async endpoint => {
            const response = await fetch('https://api.vercel.com' + endpoint, {
                headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(20000)
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                const known = ['forbidden', 'unauthorized', 'invalid_token', 'token_expired', 'not_found', 'insufficient_permissions'];
                throw Object.assign(new Error(), { httpStatus: response.status,
                    serviceCode: known.includes(body.error?.code) ? body.error.code : 'unclassified' });
            }
            return response.json();
        };
        stage = 'project_metadata';
        const project = await get('/v9/projects/' + linked.projectId + '?teamId=' + linked.orgId);
        stage = 'team_plan';
        const team = await get('/v2/teams/' + linked.orgId);
        stage = 'environment_names';
        const environment = await get('/v10/projects/' + linked.projectId + '/env?teamId=' + linked.orgId);
        const keys = ['MONGODB_URI', 'MONGODB_DB', 'MONGODB_MEDIA_BUCKET', 'MEDIA_UPLOAD_ENABLED', 'MEDIA_VIDEO_ENABLED'];
        const report = { capturedAt: new Date().toISOString(), status: 'PASS', scope: 'Vercel metadata only; no mutations, deployment or secret values',
            project: project.name, plan: team.billing?.plan || null, nodeVersion: project.nodeVersion || null,
            functions: project.resourceConfig ? { region: project.resourceConfig.functionDefaultRegions || null,
                fluid: project.resourceConfig.fluid ?? null } : null,
            networkMetadataKeys: Object.keys(project).filter(key => /static.?ip|secure.?compute|connectConfig/i.test(key)),
            previewProtectionConfigured: Boolean(project.ssoProtection),
            hasExistingAutomationBypass: Object.values(project.protectionBypass || {}).some(item => item.scope === 'automation-bypass'),
            mediaEnvironment: keys.map(key => ({ key, targets: (environment.envs || []).filter(item => item.key === key).map(item => item.target) })) };
        fs.mkdirSync('docs/media', { recursive: true });
        fs.writeFileSync('docs/media/phase2-vercel-readonly.txt', JSON.stringify(report, null, 2) + '\n');
        console.log(JSON.stringify(report));
    } catch (error) {
        const report = { capturedAt: new Date().toISOString(), status: 'FAIL', stage,
            httpStatus: Number.isInteger(error?.httpStatus) ? error.httpStatus : null,
            serviceCode: error?.serviceCode || null,
            scope: 'Vercel metadata only; no mutations, deployment or secret values' };
        fs.mkdirSync('docs/media', { recursive: true });
        fs.writeFileSync('docs/media/phase2-vercel-readonly.txt', JSON.stringify(report, null, 2) + '\n');
        console.error(JSON.stringify(report));
        process.exitCode = 1;
    }
}
main();
