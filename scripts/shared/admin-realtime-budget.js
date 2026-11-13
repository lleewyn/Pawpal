(function(){
    'use strict';
    function install(client){
        if(!client?.channel || client.__pawpalRealtimeBudget)return;
        client.__pawpalRealtimeBudget=true;
        const originalChannel=client.channel.bind(client),originalRemove=client.removeChannel.bind(client),originalRemoveAll=client.removeAllChannels.bind(client);
        const records=new Map();
        let channelSequence=0;
        const owners={'admin_customers_realtime':'Khách hàng','admin-pets-live':'Thú cưng','admin-services-live-sync':'Dịch vụ','admin-orders-live-sync':'Bán hàng','admin-staff-live-sync':'Nhân sự','admin_complaints_live_sync':'Khiếu nại','admin-settings-global-sync':'Cấu hình','admin-chatbot-global-sync':'Chatbot','admin-chat-rules-v1':'Chatbot','admin-dashboard-live-sync':'Dashboard','admin-ops-dashboard-live':'Dashboard'};
        const visible=record=>!document.hidden && sessionStorage.getItem('pawpal_admin_active_module')===record.module;
        function pause(record){
            const native=record.native;if(!native)return;
            record.native=null;++record.epoch;record.needsSync=true;
            Promise.resolve(originalRemove(native)).catch(()=>{});
        }
        function resume(record){
            if(record.removed||!record.subscribed||record.native||!visible(record))return;
            const turn=++record.epoch,args=[...record.args];
            // Fresh topic avoids reusing a Supabase channel that is still closing asynchronously.
            args[0]+='-visible-'+(++channelSequence);
            const native=originalChannel(...args);record.native=native;
            for(const [type,filter,callback]of record.bindings)native.on(type,filter,payload=>{if(record.epoch===turn&&visible(record))callback(payload);});
            native.subscribe((status,error)=>{
                if(record.epoch!==turn||record.removed)return;
                record.callback?.(status,error);
                if(status==='SUBSCRIBED'&&record.needsSync){
                    record.needsSync=false;
                    // No row payload was retained while paused. Invalidate conservatively once.
                    const bindings=record.bindings.filter(binding=>binding[0]==='postgres_changes');
                    // The primary entity refresh runs last so module debouncers keep its full-view callback.
                    const replay=bindings.length>1?[...bindings.slice(1),bindings[0]]:bindings;
                    for(const [type,filter,callback]of replay){
                        Promise.resolve().then(()=>{if(record.epoch===turn&&visible(record))return callback({schema:filter.schema,table:filter.table,eventType:'RESYNC',new:{},old:{}});}).catch(()=>{});
                    }
                }
            },record.timeout);
        }
        function reconcile(){for(const record of records.values())if(visible(record))resume(record);else pause(record);}
        client.channel=(...args)=>{
            const name=args[0],module=owners[name];
            if(!module)return originalChannel(...args); // Workspace/auth/global notifications stay live.
            const record={args,module,bindings:[],epoch:0,native:null,subscribed:false,removed:false,needsSync:false};
            const facade={
                on(type,filter,callback){record.bindings.push([type,filter,callback]);return facade;},
                subscribe(callback,timeout){record.callback=callback;record.timeout=timeout;record.subscribed=true;resume(record);return facade;},
                unsubscribe(){record.subscribed=false;pause(record);return Promise.resolve('ok');}
            };
            records.set(facade,record);return facade;
        };
        client.removeChannel=channel=>{
            const record=records.get(channel);if(!record)return originalRemove(channel);
            record.removed=true;records.delete(channel);pause(record);return Promise.resolve('ok');
        };
        client.removeAllChannels=()=>{for(const record of records.values()){record.removed=true;record.native=null;++record.epoch;}records.clear();return originalRemoveAll();};
        document.addEventListener('visibilitychange',reconcile);
        window.addEventListener('admin:module-changing',reconcile);
        window.addEventListener('admin:module-show',reconcile);
        window.addEventListener('admin:subtab-change',reconcile);
        window.addEventListener('pagehide',()=>{for(const record of records.values())pause(record);});
        window.addEventListener('pageshow',reconcile);
    }
    window.PawpalAdminRealtimeBudget={install};
    install(window.getSupabaseClient?.());
})();
