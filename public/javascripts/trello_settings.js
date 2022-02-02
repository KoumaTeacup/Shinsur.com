var t = TrelloPowerUp.iframe();

window.settings.addEventListener('submit', function (event) {
  // Stop the browser trying to submit the form itself.
  event.preventDefault();
  return t.set('board', 'shared', 'sproutPos', document.getElementById('sproutPos').value)
    .then(function () {
      t.closePopup();
    });
});

t.render(function () {
  return t.get('board', 'shared', 'sproutPos', 8)
    .then(data => {
      document.getElementById('sproutPos').value = data;
    })
})