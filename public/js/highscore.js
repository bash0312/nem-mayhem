// Highscore manager, responsible for displaying and updating
// players' scores
/* ----------------------------------------------------------------- */
(function () {
    var util = {
        processScore: function (points) {
            var medalSizes = [10000, 5000, 1000, 1];
            var medalCounts = {10000: 0, 5000: 0, 1000: 0, 1: 0};

            var remainder,
                currentMedal = medalSizes.shift(),
              accum = points;

            while (accum > 0) {
                remainder = accum % currentMedal;
              if (remainder == accum) { // currentMedal was too big, step down
                currentMedal = medalSizes.shift();
              } else {
                medalCounts[currentMedal] = medalCounts[currentMedal] + 1;
                accum = accum - currentMedal;
              }
            }

            return medalCounts;
        }
    }
    var highscoreManager = {
        init: function () {
            highscoreManager.score = document.getElementById('individualScores');
        },

        addPlayer: function (username, points) {
            var newElement = document.createElement('li');
            var medals = util.processScore(points);
            newElement.textContent(username + ': ' + medals[10000] + ' G, ' + medals[5000] + ' S, ' + medals[1000] + ' B, ' + medals[1] + ' P');
            newElement.setAttribute('id', 'individualScore-' + username);
        },

        updatePlayer: function (username, points) {
            var updateElement = document.getElementById('individualScore-' + username);
            var medals = util.processScore(points);
            updateElement.textContent(username + ': ' + medals[10000] + ' G, ' + medals[5000] + ' S, ' + medals[1000] + ' B, ' + medals[1] + ' P');
        }
    };
})();
