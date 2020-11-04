var jquery     = require('jquery'),
    underscore = require('underscore'),
    json_data  = require('./data/game.json'),
    api        = require('./components/api'),
    chart      = require('./components/chart'),
    template   = require('./components/template'),
    slider     = require('./components/slider');


(function(window, document, $, _) {

    "use strict";

    var $body            =  $('body'),
        $overlay_loader  =  $('[data-loader-overlay]');
	
    var events = {},
        user = {},
        questions = {},
        question_count = 0,
        hacker_names = [],
        step = 1,
        score = 0,
        chart_delay = 400,
        current_question = null,
        current_choice = null,
        current_slider_value = null;

    // Score Logic

    var score_matrix = {
    	1: 0,
    	1.2: -5,
    	1.4: -10,
    	1.6: -15,
    	1.8: -20,
    	2.0: -25,
    	2.2: -30,
    	2.4: -35,
    	2.6: -40,
    	2.8: -45,
    	3.0: -50,
    	3.2: -55
    }

	// *
	// *
	// *
	// *  Init method will run when the document
	// *  has been fully loaded.
	// *
	// *
	// *

	var init = function() {

       	// save local copy of questions in memory

        questions = json_data.questions; 
		question_count = Object.keys(questions).length;

		// same with hacker names

		hacker_names = json_data.hacker_names

		// namespaces the objects used in the script
		// templates. so intead of accessing an object
		// named "email", while within the script
		// template tag, you would access it via tmpl.email

		_.templateSettings.variable = "tmpl";
 
		// hide the loading screen and display the register
		// screen to collect a username

		global_loader(false);
		// the register_events function is a place to store
		// all event handlers that will be added to the dom.
		// keeping them all in one place makes it easier
		// to maintain over time, but complex interactions
		// should be broken up with additional functions.

		register_events();
		template.render('index');
		change_background(1);
	} // end init()
	

	// *
	// *
	// *
	// *  Register DOM Events here
	// *
	// *
	// *


	var register_events = function() {

		events = {

			// user has entered an email address that the DB
			// has recognized. proceed to questions.

			'successful_login' : function(data) {				
				$('[data-template="unregistered"]').addClass('hidden'); // hide intro screen				
				set_user(data);
				events.render_next_question();
			},

			'new_user' : function(username) {
				api.create_user(username, function(data) {
					if( data.hasOwnProperty('error_message') ) {
						events.render_error(data.error_message);
						$('[data-input="username"]').val("");
						return
					}
					events.successful_login(data); // success
				});
			},

			'render_register_page': function() {

				var name1 = random_name();
				var name2 = random_name();
				
				name2 = ( name1 === name2 ) ? random_name() : name2; 

				$('div[data-template="index"]').addClass('animate-in');
				$('div[data-template="unregistered"]').addClass('animate-in');

				setTimeout(function() {
					template.render('unregistered', { name1: name1, name2: name2 });

					// disable form submission and pass the username that was
					// inputed to the new_user event function

					$('form').submit( function(event) {
						event.preventDefault();
						events.new_user( $(this).find('[data-input="username"]').val() );
					});

					$('.fancy-input input').on('keypress', function() {
						$('.input-error').removeClass('visible');
					});

					$('div[data-template="unregistered"]').removeClass('animate-in');
				}, 200);
			},

			'form_submission' : function() {
				$('form').submit();
			},

			'render_results_page' : function() {
				var user_score = (score > 0) ? (score + score_matrix[current_slider_value]) : 0;
				user_score = (user_score > 0) ? user_score: 0;

				var message = "";

				if( (user_score >= 0) && (user_score <= 38)) { message = "Your innocent mind makes you very easy prey." }
				if( (user_score >= 37) && (user_score <= 72)) { message = "Your good nature makes you a good target for hackers." }
				if( (user_score >= 73) && (user_score <= 108)) { message = "You could stand to think more like your enemy." }
				if( (user_score >= 109) && (user_score <= 144)) { message = "No matter how devious you are, there's always more to learn." }
				if( (user_score >= 145) && (user_score <= 180)) { message = "You could be a hacking genius." }

				// save to db
				api.save_score(user.username, user_score);

				$('[data-template="question"]').addClass('animate-in');
				$('[data-template="results"]').addClass('animate-top');	

				setTimeout(function() {
					template.render('results', {
						username: user.username,
						user_score: user_score,
						message: message,
						render: function(name, data) {
							return template.compile(name, data);	
						}
					});

					$('[data-template="results"]').removeClass('animate-top');
					$('[data-template="question"]').remove();
					
				}, 400);
			},

			'render_next_question' : function() {

				change_background(step + 1);

				$('div[data-template="question"]').addClass('animate-in');

				setTimeout(function() {
					template.render('question', {
						q: questions[step],
						key: step,
						user: user,

						render: function(name, data) {
							return template.compile(name, data);	
						}
					});

					events.slider_register();
					$('div[data-template="question"]').removeClass('animate-in');
				}, 200)
			},

			'render_question_result': function(answer, result, choice, chart_progress, css_class) {
				$('div[data-template="question"]').addClass('animate-in');

				setTimeout(function() {

					template.render('question', {
						answer: answer,
						answer_emphasis: current_question.text.emphasis,
						answer_emphasis_type: current_question.text.type,
						source: current_question.text.source,
						info: result,
						css_class: css_class,
						choice: choice,
						choice_text: current_question.choices[choice],
						key: step,
						result: true,

						render: function(name, data) {
							return template.compile(name, data);	
						}
					});
					
					$('div[data-template="question"]').removeClass('animate-in');

					setTimeout(function() {
						chart.render( $('[data-chart]'), chart_progress );
					}, chart_delay);

					step++;

				}, 200);
			},

			'render_error' : function(message) {
				$(".input-error").addClass('visible').find('[data-error]').text(message);
			},

			'answer_submitted' : function() {
				// User answered question correctly
				if(current_question.answer === current_choice) {
					set_score(36);
					events.render_question_result(
						current_question.text.answer, 
						'Correct! ' + current_question.text.correct, 
						current_choice,
						current_question.chart.progress,
						null
					);
					return
				}
				// User answered question incorrectly
				events.render_question_result(
					current_question.text.answer, 
					'Incorrect! ' + current_question.text.incorrect, 
					current_choice,
					current_question.chart.progress,
					'strikeout'
				);
			},

			// user has selected one of the list items from a 
			// multiple choice question type

			'choice_selected' : function(element, event) {
				var question_id = element.parents('div[data-question]').data('question');
				var choice = element.data('choice');

				current_question = questions[question_id];
				current_choice = choice;

				events.answer_submitted();
			},

			'slider_register' : function() {
				$('#questionSlider').simpleSlider({
					range: [1,3.2],
					allowedValues: [1,1.2,1.4,1.6,1.8,2.0,2.2,2.4,2.6,2.8,3.0,3.2],
					snap: true,
					equalSteps: true
				}).bind("slider:changed", function (event, data) {
					events.slider_changed(event, data);
				});
				$('#questionSlider').simpleSlider("setValue", 2.0);
			},

			'slider_changed' : function(event, data) {
				current_slider_value = parseFloat(data.value);
			},

			'slider_selected' : function() {
				events.render_results_page();
			}

		} // events

		// Because of how underscore templates are registered
		// and injected into the DOM, event handlers won't be
		// registered. Instead, it's easier to attach an event
		// handler to the body of the DOM, and sniff the event's
		// target and then delegating from that point.

		$('body').on('click', function(event) {
			var target = $(event.target); 
			if('event' in target.data()) {
				events[target.data('event')](target, event);
			}
		});

	} // end register_events()


	// *
	// *
	// *
	// *  Helper Functions
	// *
	// *
	// *

	var set_score = function(amount) {
		score = score + amount;
	}

	var set_user = function(current_user) {
		user = current_user;
	}

	var global_loader = function(state) {
		state ? $overlay_loader.show() : $overlay_loader.hide();
	}

	var random_name = function() {
		return hacker_names[Math.floor(Math.random() * hacker_names.length)];
	}

	var change_background = function(img) {
		var old = 'bg' + (img - 1);
		$("html").removeClass(old).addClass('bg' + img);
		$(".mobile-bg img").attr('src', 'app/assets/img/bg' + img + '.png');
	}

	$(document).ready(init); // DOM Ready

})(window, document, jquery, underscore);