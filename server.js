const express = require("express");
const axios = require("axios");
const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(express.static("public"));

app.post("/process-repo", async (req, res) => {
  const { repoLink, ignoreList = [] } = req.body; // Default to empty array if not provided
  if (!repoLink) {
    return res.status(400).json({ error: "Repository link is required" });
  }

  try {
    const { owner, repo, path } = parseRepoLink(repoLink);
    const tree = await buildTree(owner, repo, path, "", ignoreList); // Pass ignoreList
    const fileContents = await getFileContents(owner, repo, path, ignoreList); // Pass ignoreList
    const output = formatOutput(tree, fileContents);
    res.json({ output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/query-repo", async (req, res) => {
  const { repoLink } = req.body;
  try {
    const { owner, repo, path } = parseRepoLink(repoLink);
    const structure = await getRepoStructure(owner, repo, path);
    res.json({ tree: structure });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function getRepoStructure(owner, repo, path = "") {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await axios.get(url);
  let structure = [];

  for (const item of response.data) {
    structure.push({ path: item.path, type: item.type });
    if (item.type === "dir") {
      const subStructure = await getRepoStructure(owner, repo, item.path);
      structure = structure.concat(subStructure);
    }
  }

  return structure;
}

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

async function buildTree(owner, repo, path, indent = "", ignoreList = []) {
  if (
    ignoreList.some(
      (ignored) => ignored.type === "dir" && path.startsWith(ignored.path + "/")
    )
  ) {
    return "";
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await axios.get(url);
  let tree = "";

  for (const item of response.data) {
    const itemPath = item.path;
    const isIgnored = ignoreList.some((ignored) => {
      if (ignored.type === "dir") {
        return itemPath.startsWith(ignored.path + "/");
      } else {
        return itemPath === ignored.path;
      }
    });
    if (isIgnored) continue;
    if (item.type === "dir") {
      tree += `${indent}├── ${item.name}/\n`;
      tree += await buildTree(
        owner,
        repo,
        itemPath,
        `${indent}│   `,
        ignoreList
      );
    } else {
      tree += `${indent}├── ${item.name}\n`;
    }
  }

  return tree;
}
async function getFileContents(owner, repo, path, ignoreList = []) {
  if (
    ignoreList.some(
      (ignored) => ignored.type === "dir" && path.startsWith(ignored.path + "/")
    )
  ) {
    return "";
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await axios.get(url);
  let contents = "";

  for (const item of response.data) {
    const itemPath = item.path;
    const isIgnored = ignoreList.some((ignored) => {
      if (ignored.type === "dir") {
        return itemPath.startsWith(ignored.path + "/");
      } else {
        return itemPath === ignored.path;
      }
    });
    if (isIgnored) continue;
    if (item.type === "file") {
      const fileResponse = await axios.get(item.download_url, {
        responseType: "text",
      });
      contents += `Path: ${item.path}\nContent:\n${fileResponse.data}\n---\n`;
    } else if (item.type === "dir") {
      contents += await getFileContents(owner, repo, itemPath, ignoreList);
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
