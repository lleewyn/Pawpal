const { getMediaMongoResources } = require('../api/media_mongodb.cjs');

(async () => {
    const { db } = await getMediaMongoResources();
    const count = await db.collection('pawpalMedia.files').countDocuments();
    const sizeAgg = await db.collection('pawpalMedia.files').aggregate([
        { $group: { _id: null, totalBytes: { $sum: '$length' } } }
    ]).toArray();
    const totalBytes = sizeAgg[0]?.totalBytes || 0;
    console.log('MongoDB GridFS Files Count:', count);
    console.log('MongoDB GridFS Total Stored:', totalBytes, 'bytes (~' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB)');
    console.log('Atlas Free Limit           : 512 MB');
    console.log('Dung lượng còn trống       : ~' + (512 - totalBytes / 1024 / 1024).toFixed(2) + ' MB');
    process.exit(0);
})().catch(err => {
    console.error(err);
    process.exit(1);
});

