document.getElementById("queryRepo").addEventListener("click", async () => {
  const repoLink = document.getElementById("repoLink").value;
  const outputElement = document.getElementById("output");
  outputElement.textContent = ""; // Clear previous output
  try {
    const response = await fetch("/query-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoLink }),
    });
    const data = await response.json();
    if (response.ok) {
      const structureDiv = document.getElementById("structure");
      structureDiv.innerHTML = generateCheckboxes(data.tree);
    } else {
      outputElement.textContent = `Error: ${data.error}`;
    }
  } catch (error) {
    outputElement.textContent = `Error: ${error.message}`;
  }
});

document.getElementById("processRepo").addEventListener("click", async () => {
  const repoLink = document.getElementById("repoLink").value;
  const ignoreList = Array.from(
    document.querySelectorAll('input[name="ignore"]:checked')
  ).map((checkbox) => ({
    path: checkbox.value,
    type: checkbox.dataset.type,
  }));
  const outputElement = document.getElementById("output");
  try {
    const response = await fetch("/process-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoLink, ignoreList }),
    });
    const data = await response.json();
    if (response.ok) {
      outputElement.textContent = data.output;
    } else {
      outputElement.textContent = `Error: ${data.error}`;
    }
  } catch (error) {
    outputElement.textContent = `Error: ${error.message}`;
  }
});

function generateCheckboxes(tree) {
  let html = "";
  tree.forEach((item) => {
    html += `<input type="checkbox" name="ignore" value="${item.path}" data-type="${item.type}"> ${item.path} (${item.type})<br>`;
  });
  return html;
}
