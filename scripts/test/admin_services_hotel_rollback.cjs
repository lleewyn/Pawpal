const fs=require('fs'),{sql}=require('../database/v1/cloud_connection.cjs');console.log(sql(fs.readFileSync(__dirname+'/admin_services_hotel_rollback.sql','utf8')));
