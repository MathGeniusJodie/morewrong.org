/*
 * This script parses an HTML file (index.html) full of contrarian posts and converts each
 * blog post into a Markdown file with YAML front matter.
 *
 * The YAML front matter includes title, author, date, and an elegantly nested "comments" array.
 *
 * Dependencies:
 *   - cheerio: For parsing HTML
 *   - turndown: For converting HTML to Markdown
 *   - js-yaml: For generating YAML front matter
 *
 * Install them using:
 *   npm install cheerio turndown js-yaml
 *
 * Run with:
 *   node parseBlog.js
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const yaml = require('js-yaml');

const turndownService = new TurndownService();

// Read and load the HTML file.
const html = fs.readFileSync('index.html', 'utf8');
const $ = cheerio.load(html);

// Create output directory if it doesn't exist.
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Recursive function to extract comments and nested replies.
function extractComments(commentElement) {
  const comments = [];
  commentElement.children('.post-comment').each((i, el) => {
    const comment = $(el);
    const author = comment.find('.post-author').first().text().trim();
    // Skip "New Comment" placeholders that are just begging for attention.
    if (author.toLowerCase().includes('new comment')) return;
    const commentHtml = comment.find('p').first().html() || '';
    const content = turndownService.turndown(commentHtml);
    // Recursively look for direct nested comments (replies).
    const replies = extractComments(comment);
    const commentData = { author, content };
    if (replies.length > 0) {
      commentData.replies = replies;
    }
    comments.push(commentData);
  });
  return comments;
}

// Process each blog post.
$('.article-container').each((i, elem) => {
  const article = $(elem);
  const title = article.find('h1').first().text().trim();
  if (!title) return; // Skip if there's no title—nobody likes a faceless post!

  // Extract metadata.
  let author = article.find('.article-author').first().text().trim();
  author = author.replace(/^by\s+/i, '');
  const date = article.find('.article-time').first().text().trim();

  // Remove the comments section to isolate the main content.
  article.find('.post-comments-box').remove();

  // Assemble the article content by excluding the title and meta.
  let contentHtml = '';
  article.children().each((j, child) => {
    const $child = $(child);
    if (!$child.is('h1') && !$child.hasClass('article-meta')) {
      contentHtml += $.html(child);
    }
  });
  const contentMarkdown = turndownService.turndown(contentHtml);

  // Extract comments (if any) using our recursive function.
  let comments = [];
  const commentsBox = article.find('.post-comments-box');
  if (commentsBox.length > 0) {
    comments = extractComments(commentsBox);
  }

  // Build YAML front matter with the post metadata and comments.
  const frontMatter = {
    title,
    author,
    date,
    comments
  };
  const yamlFront = `---\n${yaml.dump(frontMatter)}---\n\n`;

  // Combine YAML front matter and the converted Markdown content.
  const fileContent = yamlFront + contentMarkdown;

  // Generate a slug from the title for the file name.
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const fileName = path.join(outputDir, `${slug}.md`);

  fs.writeFileSync(fileName, fileContent, 'utf8');
  console.log(`Exported: ${fileName}`);
});

