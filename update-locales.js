const fs = require('fs');
const path = require('path');

const enPath = path.join('src', 'locales', 'en.json');
const hiPath = path.join('src', 'locales', 'hi.json');
const tePath = path.join('src', 'locales', 'te.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));
const te = JSON.parse(fs.readFileSync(tePath, 'utf8'));

const translations = {
  en: {
    orderPlaced: 'Order Placed',
    orderPlacedDesc: 'Your order has been placed successfully',
    processing: 'Processing',
    processingDesc: 'Farmer and Dealer are preparing your order',
    shipped: 'Shipped',
    shippedDesc: 'Dealer has picked up the items from farmer',
    inTransit: 'In Transit',
    inTransitDesc: 'Your package is on its way to your location',
    delivered: 'Delivered',
    deliveredDesc: 'Items delivered to your destination',
    trackingOrder: 'Tracking your order...',
    orderNotFound: 'Order Not Found',
    orderNotFoundDesc: "We couldn't find order information for ID:",
    backToOrders: 'Back to My Orders',
    back: 'Back',
    orderHash: 'Order #',
    successfullyDelivered: 'Successfully Delivered',
    orderCancelled: 'Order Cancelled',
    arrivingBy: 'Arriving by',
    deliveredOn: 'Delivered on',
    deliveryOnTrack: 'Your delivery is on track and currently',
    updateJustNow: 'Update: Just now',
    deliveryAddress: 'Delivery Address',
    contactAttached: 'Contact attached',
    shipmentInfo: 'Shipment Info',
    expectedSoon: 'Expected soon',
    orderSummary: 'Order Summary',
    moreItems: 'more items',
    itemsSubtotal: 'Items Subtotal',
    deliveryFee: 'Delivery Fee',
    totalPaid: 'Total Paid',
    trackAnotherOrder: 'Track Another Order',
    continueShopping: 'Continue Shopping',
    needHelp: 'Need help with this order?',
    contactSupport: 'Contact Support'
  },
  hi: {
    orderPlaced: 'ऑर्डर दिया गया',
    orderPlacedDesc: 'आपका ऑर्डर सफलतापूर्वक दे दिया गया है',
    processing: 'प्रोसेसिंग',
    processingDesc: 'किसान और डीलर आपका ऑर्डर तैयार कर रहे हैं',
    shipped: 'शिप कर दिया',
    shippedDesc: 'डीलर ने किसान से आइटम ले लिए हैं',
    inTransit: 'रास्ते में',
    inTransitDesc: 'आपका पैकेज आपके स्थान पर आ रहा है',
    delivered: 'पहुंचा दिया गया',
    deliveredDesc: 'आइटम आपके गंतव्य तक पहुंचा दिए गए हैं',
    trackingOrder: 'आपके ऑर्डर को ट्रैक कर रहे हैं...',
    orderNotFound: 'ऑर्डर नहीं मिला',
    orderNotFoundDesc: 'हमें इस आईडी के लिए ऑर्डर की जानकारी नहीं मिली:',
    backToOrders: 'मेरे ऑर्डर पर वापस लौटें',
    back: 'वापस',
    orderHash: 'ऑर्डर #',
    successfullyDelivered: 'सफलतापूर्वक पहुंचा दिया गया',
    orderCancelled: 'ऑर्डर रद्द कर दिया गया',
    arrivingBy: 'तक पहुंचेगा',
    deliveredOn: 'को पहुंचा दिया गया',
    deliveryOnTrack: 'आपकी डिलीवरी ट्रैक पर है और वर्तमान में',
    updateJustNow: 'अपडेट: अभी-अभी',
    deliveryAddress: 'डिलीवरी का पता',
    contactAttached: 'संपर्क संलग्न है',
    shipmentInfo: 'शिपमेंट की जानकारी',
    expectedSoon: 'जल्द ही अपेक्षित',
    orderSummary: 'ऑर्डर सारांश',
    moreItems: 'और आइटम',
    itemsSubtotal: 'आइटम उप-योग',
    deliveryFee: 'डिलीवरी शुल्क',
    totalPaid: 'कुल भुगतान किया',
    trackAnotherOrder: 'एक और ऑर्डर ट्रैक करें',
    continueShopping: 'खरीदारी जारी रखें',
    needHelp: 'इस ऑर्डर के लिए मदद चाहिए?',
    contactSupport: 'ग्राहक सेवा से संपर्क करें'
  },
  te: {
    orderPlaced: 'ఆర్డర్ చేయబడింది',
    orderPlacedDesc: 'మీ ఆర్డర్ విజయవంతంగా చేయబడింది',
    processing: 'ప్రాసెసింగ్',
    processingDesc: 'రైతు మరియు డీలర్ మీ ఆర్డర్ సిద్ధం చేస్తున్నారు',
    shipped: 'షిప్ చేయబడింది',
    shippedDesc: 'డీలర్ రైతు నుండి వస్తువులను తీసుకున్నారు',
    inTransit: 'దార్లో ఉంది',
    inTransitDesc: 'మీ ప్యాకేజీ మీ ప్రదేశానికి వస్తోంది',
    delivered: 'చేరుకోబడింది',
    deliveredDesc: 'వస్తువులు మీ గమ్యస్థానానికి చేరుకున్నాయి',
    trackingOrder: 'మీ ఆర్డర్‌ని ట్రాక్ చేస్తున్నాము...',
    orderNotFound: 'ఆర్డర్ కనుగొనబడలేదు',
    orderNotFoundDesc: 'ఈ IDకి సంబంధించిన ఆర్డర్ సమాచారం మాకు కనుగొనబడలేదు:',
    backToOrders: 'నా ఆర్డర్‌లకు తిరిగి వెళ్లు',
    back: 'వెనుకకు',
    orderHash: 'ఆర్డర్ #',
    successfullyDelivered: 'విజయవంతంగా డెలివరీ చేయబడింది',
    orderCancelled: 'ఆర్డర్ రద్దు చేయబడింది',
    arrivingBy: 'చేరుకునే తేదీ',
    deliveredOn: 'చేరుకున్న తేదీ',
    deliveryOnTrack: 'మీ డెలివరీ ట్రాక్‌లో ఉంది మరియు ప్రస్తుతం',
    updateJustNow: 'అప్‌డేట్: ఇప్పుడే',
    deliveryAddress: 'డెలివరీ చిరునామా',
    contactAttached: 'సంప్రదింపు జత చేయబడింది',
    shipmentInfo: 'షిప్‌మెంట్ సమాచారం',
    expectedSoon: 'తొరలో వస్తుంది',
    orderSummary: 'ఆర్డర్ సారాంశం',
    moreItems: 'మరిన్ని వస్తువులు',
    itemsSubtotal: 'వస్తువుల ఉప-మొత్తం',
    deliveryFee: 'డెలివరీ రుసుము',
    totalPaid: 'చెల్లించిన మొత్తం',
    trackAnotherOrder: 'మరొక ఆర్డర్‌ను ట్రాక్ చేయండి',
    continueShopping: 'షాపింగ్ కొనసాగించండి',
    needHelp: 'ఈ ఆర్డర్‌తో సహాయం కావాలా?',
    contactSupport: 'సహాయాన్ని సంప్రదించండి'
  }
};

en.deliveryStatus = translations.en;
hi.deliveryStatus = translations.hi;
te.deliveryStatus = translations.te;

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(hiPath, JSON.stringify(hi, null, 2));
fs.writeFileSync(tePath, JSON.stringify(te, null, 2));

console.log("Localization updated");
