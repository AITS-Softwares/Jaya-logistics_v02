export const reportCatalog=[
 {title:'Vehicle Negotiation & Rate Target',path:'/admin/reports/negotiation-target',modules:['Vehicle Negotiation','Rate Target (Vehicle Negotiation)'],description:'Targets, final rates, cost differences, vendor quotes and placement stages.',dashboard:true},
 {title:'Order Aging Dashboard',path:'/admin/reports/order-aging',modules:['Order Panel'],description:'Open orders, packages, age buckets and manager follow-up.',dashboard:true},
 {title:'Billing Dashboard',path:'/admin/reports/billing-dashboard',modules:['Billing'],description:'Saved bills, generated values and consignment detail.',dashboard:true},
 {title:'Order Full Report',path:'/admin/reports/order-full-report',modules:['order-full-report'],description:'Existing full order report with delivery and financial status.',dashboard:false},
 {title:'Order Panel Report',path:'/admin/OrderPanel-Report',modules:['Order Panel'],description:'Existing order panel reporting workspace.',dashboard:false},
 {title:'Vehicle Negotiation Report',path:'/admin/vehiclenegotiation-Report',modules:['Vehicle Negotiation'],description:'Existing vehicle negotiation reporting workspace.',dashboard:false},
 {title:'Pricing Panel Report',path:'/admin/Pricingpanel-Report',modules:['Pricing Panel'],description:'Existing pricing panel reporting workspace.',dashboard:false},
 {title:'Loading Panel Report',path:'/admin/LoadingPanel-Report',modules:['Loading Info'],description:'Existing loading panel reporting workspace.',dashboard:false},
];
export function canOpenReport(report,canView){return report.modules.every(module=>canView(module));}
