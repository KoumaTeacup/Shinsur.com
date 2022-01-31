const fetch = require('node-fetch');

fetch('https://api.trello.com/1/boards/KWFnFxna/lists?name=TestList', {
  method: 'POST',
  headers: {
    'Accept': 'application/json'
  }
})
  .then(response => {
    console.log(
      `Response: ${response.status} ${response.statusText}`
    );
    return response.text();
  })
  .then(text => console.log(text))
  .catch(err => console.error(err));