// Verified existing assets for CSV variants whose image fields are empty.
// Keep this in the import layer so the UI always uses database-owned media.
const variantArtwork = {
    'PK-BALO-05-V1': ['/assets/images/shop/products/PK-BALO-05.png'],
    'PK-BALO-05-V2': ['/assets/images/shop/products/pk-balo-05.jpg'],
};
function productArtwork(code) {
    if (code !== 'PK-BALO-05') return null;
    return [
        '/assets/images/shop/products/pk-balo-05.jpg',
        '/assets/images/shop/products/PK-BALO-05.png',
        '/assets/images/shop/products/PK-BALO-05_2.png',
        '/assets/images/shop/products/PK-BALO-05_3.png',
        '/assets/images/shop/products/PK-BALO-05_4.png',
    ];
}
module.exports = {variantArtwork, productArtwork};
