const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch("http://localhost:8081/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Fresh farm-grown tomatoes harvested at optimal ripeness",
        targetLang: "Telugu",
        mode: "general"
      })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
