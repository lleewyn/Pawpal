const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const source = fs.readFileSync(path.join(root, 'PAWPAL_THIET_KE_DATABASE_3NF_V1.md'), 'utf8');
const tables = [];
let table;
for (const line of source.split(/\r?\n/)) {
    const cells = line.split('|').map(s => s.trim());
    if (cells.length !== 7) continue;
    if (/^\d+$/.test(cells[1])) {
        table = { name: cells[2].replaceAll('`',''), description: cells[3], columns: [] };
        tables.push(table);
    }
    if (!table || !cells[4].startsWith('`')) continue;
    const name = cells[4].match(/^`(\w+)`/)[1];
    const match = cells[4].match(/FK → (?:(auth)\.)?(\w+)\.(\w+)/);
    table.columns.push({ name, description: cells[5], pk: /\bPK\b/.test(cells[4]),
        unique: /\bUQ\b/.test(cells[4]), ref: match ? `${match[1] || 'public'}.${match[2]}(${match[3]})` : null });
}
if (tables.length !== 105 || tables.reduce((s,t)=>s+t.columns.length,0) !== 906) throw Error('V1 dictionary changed; review generator');
if (new Set(tables.map(t=>t.name)).size !== 105) throw Error('Duplicate tables');
// The dictionary omits these FK annotations, but sections 8/13 require them.
for (const name of ['promotion_product','promotion_service']) tables.find(t=>t.name===name).columns.find(c=>c.name==='promotion_id').ref='public.promotion(id)';
const words = s => new Set(s.split(/\s+/).filter(Boolean));
const booleans = words('is_primary is_default is_active is_thumbnail is_required service_locked must_change_password is_internal is_urgent is_toxic notify_admin approval_required expected_handover available requires_info');
const integers = words('points required_points max_usage sequence_no rank_order estimated_duration display_order capacity change_count quantity duration_minutes duration_delta_minutes schema_version revision_no file_size quantity_in_stock minimum_stock estimated_days rating view_count violation_count sentiment_level tier_level level sla_seconds max_points priority usage_count expected_sentiment');
const numerics = words('minimum_expenditure discount_percent reward_value discount_value minimum_order_amount discount_amount_snapshot weight weight_from weight_to unit_price distance_from distance_to base_price surcharge daily_price commission_rate discount_amount weight_snapshot amount_delta distance_km quoted_amount cost_price sale_price compare_at_price shipping_fee_snapshot fee amount eligible_spend_amount requested_amount approved_amount refunded_amount eligible_refund_amount score sentiment_score max_discount_vnd threshold_value minimum_order_value');
const dates = words('date_of_birth dob hire_date assessment_date order_date expected_date start_date end_date target_date');
const json = words('metadata specs bank_info');
const arrays = words('keywords detected_keywords');
const textual = words(`code role_code permission_code auto_assign_role token_hash customer_code customer_status note contact_email full_name gender phone_number receiver_name receiver_phone province street_address postal_code tier_name description rule_name reward_type trigger_event voucher_code voucher_name type applicable_for acquired_method voucher_status status idempotency_key species_name breed_name pet_code pet_name avatar_url color routine allergy safety_note level_code level_name category_code category_name service_code service_name benefits amenities image_url addon_name action_name room_type room_number appointment_code name_snapshot record_type condition_note safety_note_snapshot allergy_note_snapshot customer_confirmation_status adjustment_type reason approval_status customer_consent_status booking_code special_diet_notes care_notes pickup_address dropoff_address trip_type observed_condition action_name_snapshot media_type media_url file_name supplier_name contact_person email address product_name unit target_pet slug origin ingredients usage_instructions badge brand_name color_name hex_code size_name flavor_name sku_variant barcode order_number cart_status order_code receiver_name_snapshot receiver_phone_snapshot province_snapshot street_address_snapshot postal_code_snapshot tracking_code shipping_status product_name_snapshot sku_snapshot transaction_type name short_name icon redirect_url provider_name provider_code logo_url contact_phone tracking_url payment_code payment_type transaction_status gateway_transaction_id refund_code refund_type refund_method refund_status resolution_type return_type request_status review_content review_status response_content ticket_code channel category subject requested_resolution investigation_note resolution_note rating_comment sender_type content file_url job_title specialization employment_status availability_status schedule_status assessment_type result request_type leave_type shift target_shift promotion_name discount_type title link button_text summary thumbnail_url notification_type setting_key setting_value setting_type action entity_name sentiment_trend ai_summary internal_note resolved_reason raw_content comment role color_badge trigger_pattern context_domain bot_behavior instructions issue_type condition_name trigger_type question answer prompt_key persona_name tone_of_voice shortcut keyword severity replacement_text scenario_name sample_user_input expected_tool_call benchmark_status notes`);
const overrides = {
 'access_role.role_name':'text',
 'service_addon.price':'numeric(18,4)',
 'chat_conversation.sla_deadline':'timestamptz',
 'chat_conversation.blocked_until':'timestamptz',
 'chat_moderation_log.action_taken':'text',
 'staff_assessment.score':'numeric(5,2)', 'chat_feedback.score':'smallint',
 'chatbot_sentiment_trigger.weight':'numeric(10,4)', 'chatbot_knowledge_faq.priority':'integer',
 'support_ticket.priority':'text', 'chatbot_scenario_matrix.expected_sentiment':'integer',
 'guest_session.token_hash':'text', 'admin_copilot_history.session_id':'uuid', 'audit_log.entity_id':'uuid',
 'document_embeddings.embedding':'extensions.vector',
};
// Optional FK sets are explicit; all remaining relationships are mandatory.
const optional = {
 customer:'auth_user_id contact_email note', customer_profile:'date_of_birth gender', customer_phone:'verified_at',
 customer_address:'postal_code', membership_tier:'description',
 paw_point_transaction:'payment_id review_id reward_rule_id refund_transaction_id voucher_redemption_id customer_voucher_id description',
 voucher:'description max_usage', customer_voucher:'expired_at', voucher_redemption:'customer_voucher_id order_id appointment_id reversed_at',
 pet_profile:'avatar_url gender date_of_birth color routine allergy safety_note', pet_weight_history:'recorded_by note',
 service:'description commission_rate benefits staff_level_required_id amenities', service_addon:'description',
 service_price_matrix:'weight_to effective_to', taxi_price_rule:'distance_to weight_to effective_to', hotel_room_type:'description amenities',hotel_room:'description',
 appointment:'staff_id check_in_time check_out_time note',
 appointment_item:'service_id service_addon_id weight_snapshot staff_id',
 appointment_record:'confirmed_at note safety_note_snapshot allergy_note_snapshot',
 appointment_adjustment:'approved_by approved_at', hotel_booking:'special_diet_notes care_notes',
 taxi_trip:'driver_staff_id outbound_at return_at taxi_price_rule_id',
 care_log:'care_action_id description observed_condition recorded_by', care_log_media:'staff_id',
 supplier:'contact_person phone_number email address', product_category:'description',
 product:'description origin ingredients benefits usage_instructions specs badge brand_name target_pet',
 product_variant:'color_id size_id flavor_id compare_at_price weight barcode', purchase_order:'expected_date note',
 sales_order:'note receiver_name_snapshot receiver_phone_snapshot province_snapshot street_address_snapshot postal_code_snapshot delivery_option_id shipping_provider_id tracking_code shipped_at delivered_at shipping_status',
 stock_reservation:'cart_id order_id', inventory_transaction:'note staff_id purchase_order_detail_id sales_order_detail_id return_request_detail_id',
 payment_method_config:'short_name description icon redirect_url bank_info', delivery_option_config:'description icon estimated_days',
 shipping_provider:'logo_url contact_phone tracking_url', payment:'succeeded_at gateway_transaction_id order_id appointment_id',
 refund_transaction:'ticket_id gateway_transaction_id note processed_by processed_at completed_at return_request_id',
 return_request:'resolution_type resolved_by description', review:'review_content sales_order_detail_id appointment_item_id',
 support_ticket:'customer_id order_id appointment_id description requested_resolution requested_amount assigned_staff_id first_response_at investigation_note resolution_type resolution_note approved_amount resolved_by resolved_at closed_at rating rating_comment created_by_account_id',
 support_ticket_message:'sender_account_id sender_guest_session_id',
 staff:'phone_number specialization email address dob staff_level_id hire_date',
 staff_schedule:'reason',staff_assessment:'note', staff_shift_request:'target_staff_id replacement_staff_id leave_type target_date target_shift reviewed_by reviewed_at',
 promotion:'description', banner:'description link button_text start_date end_date',blog_category:'description',
 blog_post:'summary thumbnail_url publish_at', notification:'sales_order_id appointment_id support_ticket_id refund_transaction_id read_at',
 pawpal_setting:'description',audit_log:'staff_id entity_name entity_id description',
 chat_conversation:'customer_id assigned_staff_id ai_summary internal_note sla_deadline resolved_at resolved_reason resolved_by blocked_until guest_session_id',
 chat_message:'raw_content sender_account_id sender_guest_session_id',chat_moderation_log:'customer_id notes',chat_feedback:'comment',
 chatbot_sentiment_tier:'description',chatbot_sentiment_action:'suggested_canned_id instructions',chatbot_compensation_policy:'description',
 chatbot_handover_rule:'auto_assign_role',chatbot_profanity_filter:'replacement_text',
 guest_session:'revoked_at', chatbot_scenario_matrix:'expected_tool_call',
};
const timestampDefaults = words('created_at updated_at registered_at assigned_at measured_at recorded_at uploaded_at added_at acquired_at redeemed_at reserved_at last_updated_at submitted_at sent_at');
const zeroDefaults = words('display_order change_count revision_no discount_amount discount_amount_snapshot duration_delta_minutes amount_delta shipping_fee_snapshot quantity_in_stock minimum_stock eligible_spend_amount eligible_refund_amount view_count violation_count usage_count required_points fee surcharge commission_rate discount_percent minimum_expenditure minimum_order_amount minimum_order_value');
function typeFor(t,c) {
 const k=t.name+'.'+c.name;
 if(overrides[k]) return overrides[k];
 if(c.ref) return /\(code\)$/.test(c.ref) ? 'text' : /\(level\)$/.test(c.ref) ? 'integer' : 'uuid';
 if(c.name==='id') return 'uuid';
 if(booleans.has(c.name)) return 'boolean';
 if(dates.has(c.name)) return 'date';
 if(/_at$/.test(c.name) || ['check_in_time','check_out_time','effective_from','effective_to'].includes(c.name)) return 'timestamptz';
 if(integers.has(c.name)) return c.name==='file_size'||c.name==='sequence_no' ? 'bigint' : 'integer';
 if(numerics.has(c.name)) return 'numeric(18,4)';
 if(json.has(c.name)) return 'jsonb';
 if(arrays.has(c.name)) return 'text[]';
 if(c.name.endsWith('_status')) return 'text';
 if(textual.has(c.name)) return 'text';
 throw Error('Unspecified physical type: '+k);
}
for(const t of tables) {
 const opt=words(optional[t.name]||'');
 for(const name of opt) if(!t.columns.some(c=>c.name===name)) throw Error('Invalid nullable declaration '+t.name+'.'+name);
 for(const c of t.columns) {
  c.type=typeFor(t,c); c.nullable=opt.has(c.name)&&!c.pk; c.default=null;
  if(c.name==='id'&&c.type==='uuid') c.default='gen_random_uuid()';
  else if(timestampDefaults.has(c.name)&&!c.nullable) c.default='now()';
  else if(c.type==='boolean') c.default=c.name==='is_active'||c.name==='available' ? 'true':'false';
  else if(zeroDefaults.has(c.name)) c.default='0';
  else if(c.type==='jsonb'&&!c.nullable) c.default="'{}'::jsonb";
  else if(c.type==='text[]') c.default="'{}'::text[]";
 }
 if(!t.columns.some(c=>c.pk)) throw Error('Missing PK '+t.name);
}
module.exports = {tables,root,hash:crypto.createHash('sha256').update(JSON.stringify(tables)).digest('hex')};
