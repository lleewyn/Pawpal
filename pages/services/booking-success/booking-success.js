const params=new URLSearchParams(location.search);
const id=params.get('id') || params.get('bookingId') || params.get('code');
location.replace(id?'/user#booking-detail?id='+encodeURIComponent(id):'/user#bookings');
