// Legacy callback URLs do not prove a collection. Show the server-owned order.
(() => {
    const params=new URLSearchParams(window.location.search);
    const id=params.get('orderId')||params.get('vnp_TxnRef');
    window.location.replace(id?'/user#order-detail?orderId='+encodeURIComponent(id):'/user#orders');
})();
