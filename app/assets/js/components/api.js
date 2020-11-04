var jquery = require('jquery');

module.exports = function($) {

	var create_user = function(username, callback) {
		$.post( "user/new.json", { username: username }, callback);
	}

	var save_score = function(username, score, callback) {
		$.post( "score/new.json", { username: username, score: score }, callback);
	}

	return {
		create_user : create_user,
		save_score  : save_score
	};
}(jquery);