const fs = require("fs");
const path = require("path");
const frontMatter = require("front-matter");
const { marked } = require("marked");
const yaml = require("js-yaml");

// filepath: /home/jodie/Downloads/morewrong.org/compile.js
/*
 * This script reads Markdown files with YAML front matter from the 'output' directory
 * and compiles them back into an HTML file that matches the original structure.
 *
 * Dependencies:
 *   - js-yaml: For parsing YAML front matter
 *   - marked: For converting Markdown to HTML
 *   - front-matter: For extracting front matter from Markdown files
 *
 * Install them using:
 *   npm install js-yaml marked front-matter
 *
 * Run with:
 *   node compile.js
 */

// Create the base HTML template
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
            href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400..900;1,400..900&amp;family=Lato:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&amp;display=swap"
            rel="stylesheet"
        />
        <title>MoreWrong</title>
        <link rel="stylesheet" href="index.css" />
    </head>
    <body>
        <!-- Header -->
        <header>
            <div class="header-left">
                <!-- <button class="menu-button">☰</button>-->
                <a href="#" class="logo">MOREWRONG</a>
            </div>
            <!--<div class="header-right">
            <div class="search-bar">
                <span class="search-icon">🔍</span>
                <input type="text" class="search-input" placeholder="Search here...">
            </div>
        </div>-->
        </header>
        {{CONTENT}}
        <!-- Main container -->
        <div class="main-container">
            <!-- Content -->
            <div class="content">
                <!-- Post list -->
                <div class="post-list">
                {{POSTLIST}}
                </details>
            </div>
        </div>

        <a href="https://github.com/MathGeniusJodie/morewrong.org" class="add-post">
            Contribute to MoreWrong by adding a post!
        </a>
    </body>
</html>
`;

// Directory containing Markdown files
const inputDir = path.join(__dirname, "output");
const outputFile = path.join(__dirname, "index.html");

// Read all Markdown files from the input directory
const files = fs
  .readdirSync(inputDir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => path.join(inputDir, file));

// Process each file and create article HTML
function renderComments(comments) {
  if (!comments || !comments.length) return "";

  let html = "";
  comments.forEach((comment) => {
    html += `<div class="post-comment">
            <span class="post-author">${comment.author || "Anonymous"}</span>`;

    if (comment.karma !== undefined) {
      html += `
            <button class="downvote-button">&#9660;</button>
            <span class="comment-score">${comment.karma}</span>
            <button class="upvote-button">&#9650;</button>
            <span class="comment-button-spacer"></span>
            <button class="minus-button">-</button>
            <span class="comment-score-2">${comment.aggreement || "0"}</span>
            <button class="plus-button">+</button>`;
    }

    html += `
            <p>${comment.content || ""}</p>`;

    if (comment.replies && comment.replies.length > 0) {
      html += renderComments(comment.replies);
    }

    html += `</div>`;
  });

  return html;
}

function generateArticleHTML(files) {
  let articles = [];

  files.forEach((file, index) => {
    const content = fs.readFileSync(file, "utf8");
    const { attributes, body } = frontMatter(content);

    // Convert Markdown to HTML
    const bodyHtml = marked(body);

    // Generate the article ID
    const articleId = file.replace(/\.md$/, "");

    // Create the article HTML
    let articleHtml = `
        <div class="article-container" id="${articleId}">
            <h1>${attributes.title}</h1>
            <div class="article-meta">
                <span class="article-author"><span class="article-by">by</span> ${
                  attributes.author
                }</span>
                <time class="article-time">${
                  attributes.date == "NA"
                    ? "NA"
                    : new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }).format(new Date(attributes.date))
                }</time>
            </div>
            ${bodyHtml}
            <div class="post-comments-box">
                <div class="post-comment">
                    <span class="post-author">New Comment</span>
                    <p>Text goes here! Pull request to add a comment!</p>
                    <a
            href="https://github.com/MathGeniusJodie/morewrong.org"
            class="comment-button"
            >Comment</a
          >
                </div>
                ${renderComments(attributes.comments)}
            </div>
        </div>
        `;

    articles.push({ id: articleId, html: articleHtml, date: attributes.date });
  });

  return articles.map((article) => article.html).join("\n");
}

function shortHumanize(date) {
  if (date === "NA") return "NA";
  const ms = new Date(date).getTime();
  const now = Date.now();
  const diff = now - ms;
  const units = { y: 31536000000, d: 86400000, h: 3600000, m: 60000, s: 1000 };
  for (const [unit, value] of Object.entries(units)) {
    if (diff >= value) return Math.round(diff / value) + unit;
  }
  return "0s";
}

function generatePostListHTML(files) {
  let postList = [];
  let postList2 = [];
  let objList = [];

  files.forEach((file, index) => {
    const content = fs.readFileSync(file, "utf8");
    const { attributes } = frontMatter(content);
    attributes.file = file;
    let commentsCount = 0;
    if (attributes.comments && attributes.comments.length > 0) {
      attributes.comments.forEach((comment) => {
        if (comment.replies && comment.replies.length > 0) {
          commentsCount += comment.replies.length;
        }
        commentsCount++;
      });
    }
    attributes.commentsCount = commentsCount;
    objList.push(attributes);
  });

  objList = objList.sort((a, b) => {
    if (b.pin) return 1; // Pinned posts come first
    if (a.pin) return -1; // Pinned posts come first
    if (a.date === "NA") return 1; // Treat "NA" as the latest date
    if (b.date === "NA") return -1; // Treat "NA" as the latest date
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA; // Sort in descending order
  });

  objList.forEach((attributes, index) => {
    // Generate the article ID
    const articleId = attributes.file.replace(/\.md$/, "");

    // Create the post list HTML
    let postListHtml = `
        <div class="post-item">
            <div class="post-score">${Math.floor(Math.random() * 100)}</div>
            <div class="post-content">
              <a href="#${articleId}" class="post-title"
                >${
                  attributes.pin
                    ? `<span class="post-title-star">★</span> `
                    : ""
                }${attributes.title}</a
              >
              <div class="post-meta">
                <span class="post-author">${attributes.author}</span>
              </div>
            </div>
            <div class="post-time">${shortHumanize(attributes.date)}</div>
            <div class="post-comments">${attributes.commentsCount}</div>
          </div>
        `;
    if (attributes.date === "NA") {
      postList2.push(postListHtml);
    } else {
      postList.push(postListHtml);
    }
  });

  return (
    postList.join("\n") + `</div><details open class="post-list"><summary>Upcoming Posts</summary>` + postList2.join("\n")
  );
}

// Generate the full HTML file
function generateHTML() {
  try {
    const articlesHTML = generateArticleHTML(files);
    const fullHtml = htmlTemplate.replace("{{CONTENT}}", articlesHTML);
    const postListHTML = generatePostListHTML(files);
    const finalHtml = fullHtml.replace("{{POSTLIST}}", postListHTML);

    fs.writeFileSync(outputFile, finalHtml, "utf8");
    console.log(`Successfully compiled HTML to: ${outputFile}`);
  } catch (error) {
    console.error("Error generating HTML:", error);
  }
}

generateHTML();
