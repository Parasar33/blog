const fs = require('fs');
const fetch = require('node-fetch');

const token = process.env.TOKEN_GITHUB;

async function run() {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `token ${token}` },
  });

  const data = await res.json();
  fs.writeFileSync('github-data.json', JSON.stringify(data, null, 2));
}

run();
