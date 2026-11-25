// Reviewed V1 sales functions only. Backups and connection secrets stay outside the repository.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {infra,cloud,sql}=require('./cloud_connection.cjs');
const {verify}=require('./verify.cjs');
const snapshotQuery=`SELECT json_build_object('products',(SELECT count(*) FROM product),'variants',(SELECT count(*) FROM product_variant),'orders',(SELECT count(*) FROM sales_order),'customers',(SELECT count(*) FROM customer),'payments',(SELECT count(*) FROM payment),'refunds',(SELECT count(*) FROM refund_transaction),'stock',(SELECT sum(quantity_in_stock) FROM inventory),'points',(SELECT sum(total_paw_points) FROM customer_point_balance))`;
const action=process.argv[2];if(action!=='apply')throw Error('Use apply after restored-database verification');
const before=sql(snapshotQuery),shape=verify((db,q)=>sql(q),'postgres');
const folder=path.join(infra,'backups','sales-cloud-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'before-counts.private.txt'),before+'\n');
const dump=cloud('pg_dump',['--schema=public','--schema=pawpal_private','--no-owner','--no-privileges'],'',{folder,timeout:180000});
fs.writeFileSync(path.join(folder,'before-sales.private.sql'),dump);
fs.writeFileSync(path.join(folder,'before-SHA256.txt'),crypto.createHash('sha256').update(dump).digest('hex')+'\n');
const files=fs.readdirSync(__dirname).filter(f=>/^0(19|2[0-8])_admin_sales_[a-z_]+\.sql$/.test(f)).sort();
if(files.length!==10)throw Error('Expected migrations 019 through 028');
for(const file of files){sql(fs.readFileSync(path.join(__dirname,file),'utf8'),{folder});console.log('Applied '+file);}
const after=sql(snapshotQuery);if(before!==after)throw Error('Business balances/counts changed: inspect private backup before proceeding');
const afterShape=verify((db,q)=>sql(q),'postgres');
if(JSON.stringify(shape)!==JSON.stringify(afterShape))throw Error('Physical schema changed');
fs.writeFileSync(path.join(folder,'after-counts.private.txt'),after+'\n');
fs.writeFileSync(path.join(folder,'verification.txt'),JSON.stringify({shape:afterShape,unchangedBusinessCounts:true,migrations:files},null,2));
console.log('PASS Cloud V1 schema and source balances unchanged. Backup: '+folder);
