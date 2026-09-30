const crypto = require('crypto');
const qs = require('qs');

function sortObject(obj) {
    const sorted = {};
    const str = [];
    let key;
    for (key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
    }
    return sorted;
}

function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

function removeVietnameseTones(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .trim();
}

async function createPaymentUrl(req, res) {
    try {
        require('dotenv').config({ override: true });
        const { orderId, amount, orderInfo, bankCode } = req.body;

        if (!orderId || !amount) {
            return res.status(400).json({ success: false, message: 'Thiếu orderId hoặc amount' });
        }

        const tmnCode = process.env.VNP_TMN_CODE || '8IZYWTY5';
        const secretKey = process.env.VNP_HASH_SECRET || 'NXUBWYVHQIEEKLEXEAKKIOSTSMMOZNLR';
        const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const returnUrl = process.env.VNP_RETURN_URL || 'http://localhost:3000/pages/shop/payment-success/payment-success.html';

        const date = new Date();
        const createDate = formatDate(date);
        const expireDate = formatDate(new Date(date.getTime() + 15 * 60 * 1000));

        let ipAddr = req.headers?.['x-forwarded-for'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            '127.0.0.1';

        if (Array.isArray(ipAddr)) ipAddr = ipAddr[0];
        if (ipAddr && ipAddr.includes(',')) ipAddr = ipAddr.split(',')[0].trim();
        if (ipAddr === '::1' || !ipAddr) ipAddr = '127.0.0.1';

        const parsedAmount = Math.round(Number(amount));
        const cleanOrderInfo = removeVietnameseTones(orderInfo || `Thanh toan don hang ${orderId}`) || `Thanh toan don hang ${orderId}`;

        let vnp_Params = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Locale: 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: String(orderId),
            vnp_OrderInfo: cleanOrderInfo,
            vnp_OrderType: 'other',
            vnp_Amount: parsedAmount * 100,
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate,
            vnp_ExpireDate: expireDate
        };

        if (bankCode) {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        vnp_Params = sortObject(vnp_Params);
        const signData = qs.stringify(vnp_Params, { encode: false });

        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        vnp_Params['vnp_SecureHash'] = signed;
        const paymentUrl = `${vnpUrl}?${qs.stringify(vnp_Params, { encode: false })}`;

        return res.json({
            success: true,
            paymentUrl
        });
    } catch (error) {
        console.error('[VNPay API] createPaymentUrl error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

function verifyReturnUrl(query) {
    try {
        let vnp_Params = { ...query };
        const secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        const secretKey = process.env.VNP_HASH_SECRET || 'NXUBWYVHQIEEKLEXEAKKIOSTSMMOZNLR';
        vnp_Params = sortObject(vnp_Params);
        const signData = qs.stringify(vnp_Params, { encode: false });

        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        const isMatch = (secureHash || '').toLowerCase() === signed.toLowerCase();
        return {
            isValid: isMatch,
            responseCode: vnp_Params['vnp_ResponseCode'],
            orderId: vnp_Params['vnp_TxnRef'],
            amount: Number(vnp_Params['vnp_Amount']) / 100,
            transactionNo: vnp_Params['vnp_TransactionNo'],
            bankCode: vnp_Params['vnp_BankCode']
        };
    } catch (e) {
        console.error('[VNPay API] verifyReturnUrl error:', e);
        return { isValid: false, error: e.message };
    }
}

module.exports = {
    createPaymentUrl,
    verifyReturnUrl
};
