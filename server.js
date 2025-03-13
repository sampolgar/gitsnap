const express = require("express");
const axios = require("axios");
const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(express.static("public"));

// POST endpoint to process the repository link
app.post("/process-repo", async (req, res) => {
  const { repoLink } = req.body;
  if (!repoLink) {
    return res.status(400).json({ error: "Repository link is required" });
  }

  try {
    const { owner, repo, path } = parseRepoLink(repoLink);
    const tree = await buildTree(owner, repo, path);
    const fileContents = await getFileContents(owner, repo, path);
    const output = formatOutput(tree, fileContents);
    res.json({ output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function parseRepoLink(link) {
  const match = link.match(
    /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+\/(.+))?/
  );
  if (!match) {
    throw new Error("Invalid GitHub repository link");
  }
  const [, owner, repo, path] = match;
  return { owner, repo, path: path || "" }; // Path is empty if not provided
}

async function buildTree(owner, repo, path, indent = "") {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await axios.get(url);
  let tree = "";

  for (const item of response.data) {
    if (item.type === "dir") {
      tree += `${indent}├── ${item.name}/\n`;
      tree += await buildTree(
        owner,
        repo,
        `${path ? path + "/" : ""}${item.name}`,
        `${indent}│   `
      );
    } else {
      tree += `${indent}├── ${item.name}\n`;
    }
  }

  return tree;
}

async function getFileContents(owner, repo, path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await axios.get(url);
  let contents = "";

  for (const item of response.data) {
    if (item.type === "file") {
      const fileResponse = await axios.get(item.download_url);
      contents += `Path: ${item.path}\nContent:\n${fileResponse.data}\n---\n`;
    } else if (item.type === "dir") {
      contents += await getFileContents(
        owner,
        repo,
        `${path ? path + "/" : ""}${item.name}`
      );
    }
  }

  return contents;
}

function formatOutput(tree, fileContents) {
  return `${tree}\n---\n${fileContents}`;
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
