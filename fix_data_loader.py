import re

with open('scripts/shared/data-loader.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the broken tail of getProductReviews and getServiceReviews
broken_start = content.find("async function getProductReviews(productId) {")
if broken_start != -1:
    broken_end = content.find("// Export functions for use in other modules")
    if broken_end != -1:
        # We will replace everything from broken_start to broken_end
        replacement = """async function getProductReviews(productId) {
    if (!window.SupabaseClient) {
        console.warn('Supabase not available for fetching reviews.');
        return [];
    }
    const db = window.SupabaseClient;
    if (!db) return [];

    try {
        const { data, error } = await db
            .from('review')
            .select(`
                *,
                customer:customer_id (
                    customer_profile (full_name)
                )
            `)
            .eq('product_id', productId)
            .eq('review_status', 'APPROVED')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return data.map(r => ({
            id: r.id,
            rating: r.rating,
            content: r.review_content,
            createdAt: r.created_at,
            customerName: r.customer?.customer_profile?.[0]?.full_name || 'Khách hàng',
            hasMedia: false,
            hasReply: false
        }));
    } catch (err) {
        console.error('Error fetching product reviews:', err);
        return [];
    }
}

async function getServiceReviews(serviceId) {
    const supabase = window.SupabaseClient;
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('review')
            .select(`
                id,
                rating,
                review_content,
                image_urls,
                created_at,
                customer (
                    customer_profile (
                        full_name
                    ),
                    membership_tier (
                        name
                    )
                ),
                review_response (
                    response_content
                )
            `)
            .eq('review_type', 'SERVICE')
            .eq('service_id', serviceId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        const getTierName = (tierStr) => {
            if (!tierStr) return 'Thành viên';
            const t = tierStr.toLowerCase();
            switch(t) {
                case 'diamond': return 'Hội viên Kim Cương';
                case 'gold': return 'Hội viên Vàng';
                case 'silver': return 'Hội viên Bạc';
                default: return 'Thành viên';
            }
        };

        return data.map(r => {
            const rawTier = r.customer?.membership_tier?.name ? r.customer.membership_tier.name.toLowerCase() : 'member';
            const sellerReply = (r.review_response && r.review_response.length > 0) ? r.review_response[0].response_content : null;
            
            return {
                id: r.id,
                name: r.customer?.customer_profile?.[0]?.full_name || 'Khách hàng',
                tier: rawTier,
                tierName: getTierName(rawTier),
                rating: r.rating,
                date: r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '',
                text: r.review_content,
                images: r.image_urls || [],
                sellerReply: sellerReply,
                helpfulCount: Math.floor(Math.random() * 10) + 1
            };
        });
    } catch (error) {
        console.error('Error fetching service reviews:', error);
        return [];
    }
}

"""
        content = content[:broken_start] + replacement + content[broken_end:]

with open('scripts/shared/data-loader.js', 'w', encoding='utf-8') as f:
    f.write(content)
