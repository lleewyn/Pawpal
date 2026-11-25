// Payments are confirmed by staff; the old simulator cannot change an order.
(() => {
    const params=new URLSearchParams(window.location.search);
    const id=params.get('orderId');
    window.location.replace(id?'/user#order-detail?orderId='+encodeURIComponent(id):'/user#orders');
})();
