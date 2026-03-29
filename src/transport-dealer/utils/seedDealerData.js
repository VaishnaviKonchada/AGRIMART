export function seedDealerData(user) {
  const seeded = localStorage.getItem("dealerSeeded") === "true";
  if (seeded) return;

  const dealerId = user?.id || 1;
  const dealerName = user?.name || "Demo Dealer";

  const deliveries = [
    { id: 1001, dealerId, dealerName, customerName: "Rahul", destination: "Noida", status: "Pending", amount: 350, date: new Date().toLocaleDateString() },
    { id: 1002, dealerId, dealerName, customerName: "Anita", destination: "Delhi", status: "In Transit", amount: 500, date: new Date().toLocaleDateString() },
    { id: 1003, dealerId, dealerName, customerName: "Suresh", destination: "Gurgaon", status: "Delivered", amount: 750, date: new Date().toLocaleDateString() },
  ];

  const vehicles = [
    { id: 1, dealerId, dealerName, name: "Tata 407", type: "Truck", licensePlate: "DL01AB1234", capacity: 2500, year: 2020, insuranceExpiry: "2026-12-31", documentVerified: true },
    { id: 2, dealerId, dealerName, name: "Mahindra Bolero", type: "Van", licensePlate: "DL02CD5678", capacity: 800, year: 2021, insuranceExpiry: "2026-10-15", documentVerified: true },
  ];

  const chats = [
    { id: 1, dealerId, dealerName, customerName: "Rahul", orderId: 1001, lastMessage: "Please deliver by evening", lastTime: new Date().toLocaleTimeString(), messages: [] },
  ];

  localStorage.setItem("deliveries", JSON.stringify(deliveries));
  localStorage.setItem("dealerVehicles", JSON.stringify(vehicles));
  localStorage.setItem("dealerChats", JSON.stringify(chats));
  localStorage.setItem("dealerSeeded", "true");
}
