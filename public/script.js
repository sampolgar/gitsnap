document
  .getElementById("repoForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const repoLink = document.getElementById("repoLink").value;
    const outputElement = document.getElementById("output");

    try {
      const response = await fetch("/process-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoLink }),
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
