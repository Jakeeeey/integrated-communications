const API_BASE_URL = "http://goatedcodoer:8056";

async function checkData() {
    const fields = [
        "id",
        "document_transmittal_no",
        "sender_id",
        "receiver_id.user_id",
        "receiver_id.user_fname"
    ].join(",");
    
    const url = `${API_BASE_URL}/items/document_transmittal_header?fields=${fields}&limit=10`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

checkData();
