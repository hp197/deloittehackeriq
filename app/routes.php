<?php 
	use Symfony\Component\HttpFoundation\Response;
	use Symfony\Component\HttpFoundation\Request;
	use Symfony\Component\Finder\Finder;
	
	// We need to prepend a base path to the router in order to serve the
	// application from a subdirectory in production.

	$basepath = $app['config']['basepath'];

		
	// POST /score/new
	$app->post($basepath . '/score/new.json', function (Request $request) use ($app) {
    	$username = (string) $request->get('username');
    	$score = (string) $request->get('score');
    	$user_score = array( 'username' => $username, 'score' => $score, 'ip_address' => $_SERVER['REMOTE_ADDR']);
    	$app['db']->insert('scores', $user_score);
		return $app->json($user_score);
	});

	// POST /user/new
	
	$app->post($basepath . '/user/new.json', function (Request $request) use ($app) {
    	$username = (string) $request->get('username');
    	$user = array( 'username' => $username, 'uid' => md5($username));
		
		// Try to get the username from database if it exists
		$sql = "SELECT uid FROM users WHERE LOWER(username) = ?";
		$row = $app['db']->fetchAssoc($sql, array( $app->escape( strtolower($username) )));

		// Validations

		if(trim($username) == "") {
			return $app->json(array( 'error_message' => 'Username cannot be blank' ));
		}

		if(strlen(trim($username)) < 3 ) {
			return $app->json(array( 'error_message' => 'Username must be at least 3 characters' ));
		}

		if($row) {
			return $app->json(array( 'error_message' => 'Username exists' ));
		}

		// Valid User

		$app['db']->insert('users', $user);
		return $app->json($user);
    });
	
	// ROOT URL
	
	$app->get($basepath . '/', function (Request $request) use ($app) {
		return $app['twig']->render('index.twig', array(
		    'templates' => loadTemplateFiles()
		));
	});


	// Helper function to load templates names into an array
	// so twig can include them within the main view.

	function loadTemplateFiles() {
		$templates = array();
		$finder = new Finder();
		$finder->in('../app/views/templates');

		foreach ($finder as $file) {
			array_push($templates, $file->getRelativePathname());
		}

		return $templates;
	}

