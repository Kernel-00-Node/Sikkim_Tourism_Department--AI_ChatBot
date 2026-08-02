const form = document.getElementById('uploadForm');
const resultBox = document.getElementById('result');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultBox.style.display = 'none';
    resultBox.className = '';

    const adminKey = document.getElementById('adminKey').value;
    const fileInput = document.getElementById('file');
    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    const district = document.getElementById('district').value;

    if (!fileInput.files.length) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', title);
    formData.append('category', category);
    if (district.trim()) formData.append('district', district.trim());

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading…';

    try {
        const resp = await fetch('/api/admin/upload-circular', {
            method: 'POST',
            headers: { 'X-Admin-Key': adminKey },
            body: formData,
        });
        const data = await resp.json();

        if (resp.ok && data.status === 'ingested') {
            resultBox.className = 'ok';
            resultBox.textContent =
                '✅ Ingested successfully (circular #' + data.circular_id + ')\n\n' +
                'Extracted text preview:\n' + data.extracted_text_preview;
            form.reset();
        } else if (data.status === 'duplicate') {
            resultBox.className = 'dup';
            resultBox.textContent = '⚠️ ' + data.detail;
        } else {
            resultBox.className = 'err';
            resultBox.textContent = '❌ ' + (data.detail || 'Upload failed.');
        }
    } catch (err) {
        resultBox.className = 'err';
        resultBox.textContent = '❌ Network error: ' + err.message;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload';
        resultBox.style.display = 'block';
    }
});