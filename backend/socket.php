<?php
	include("connect.php");
	$host = 'localhost';
	$port = '9000';
	$null = NULL;
	$tableDraw = "Draw";
	
	$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
	socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);
	socket_bind($socket, 0, $port);
	socket_listen($socket);
	$clients = array($socket);
	error_log("client iniziali: ".count($clients));
	while (true) {
		$changed = $clients;
		socket_select($changed, $null, $null, 0, 10);
		if (in_array($socket, $changed)) {
			$socket_new = socket_accept($socket);
			$clients[] = $socket_new;
			$header = socket_read($socket_new, 1024);
			perform_handshaking($header, $socket_new, $host, $port);
			$found_socket = array_search($socket, $changed);
			unset($changed[$found_socket]);
			error_log("nuova connessione");
		}
		foreach ($changed as $_socket) {
			while(socket_recv($_socket, $buf, 1024 * 1024, 0) >= 1) {
				$data = json_decode(unmask($buf));
				if ($data->type == "SAVE") {
					$base64 = $data->draw->data;
					$maxX = $data->draw->maxX;
					$maxY = $data->draw->maxY;
					$minX = $data->draw->minX;
					$minY = $data->draw->minY;
					$sql = "INSERT INTO $tableDraw (data, maxX, maxY, minX, minY) VALUES ('$base64', '$maxX', '$maxY', '$minX', '$minY')";
					if (mysql_query($sql)) {
						$response = mask(json_encode(array('type'=>'SAVE_RESPONSE', 'ok'=>true, 'id'=>mysql_insert_id())));
						error_log("salvato");
					} else {
						$response = mask(json_encode(array('type'=>'SAVE_RESPONSE', 'ok'=>false)));
					}
					send_message($_socket, $response);
				}
				break 2;
			}
			// KO - non so perchè, ma la mia versione non rileva le disconnessioni
			$buf = @socket_read($changed_socket, 1024, PHP_NORMAL_READ);
			if ($buf === false) {
				$found_socket = array_search($changed_socket, $clients);
				unset($clients[$found_socket]);
				error_log("disconnesso");
			}
		}
		sleep(1);
	}
	

function send_message($socket, $msg) {
	@socket_write($socket, $msg, strlen($msg));
}

function unmask($text) {
	$length = ord($text[1]) & 127;
	if($length == 126) {
		$masks = substr($text, 4, 4);
		$data = substr($text, 8);
	}
	elseif($length == 127) {
		$masks = substr($text, 10, 4);
		$data = substr($text, 14);
	}
	else {
		$masks = substr($text, 2, 4);
		$data = substr($text, 6);
	}
	$text = "";
	for ($i = 0; $i < strlen($data); ++$i) {
		$text .= $data[$i] ^ $masks[$i%4];
	}
	return $text;
}
function mask($text) {
	$b1 = 0x80 | (0x1 & 0x0f);
	$length = strlen($text);	
	if($length <= 125)
		$header = pack('CC', $b1, $length);
	elseif($length > 125 && $length < 65536)
		$header = pack('CCn', $b1, 126, $length);
	elseif($length >= 65536)
		$header = pack('CCNN', $b1, 127, $length);
	return $header.$text;
}
function perform_handshaking($receved_header,$client_conn, $host, $port) {
	$headers = array();
	$lines = preg_split("/\r\n/", $receved_header);
	foreach($lines as $line) {
		$line = chop($line);
		if(preg_match('/\A(\S+): (.*)\z/', $line, $matches)) {
			$headers[$matches[1]] = $matches[2];
		}
	}
	$secKey = $headers['Sec-WebSocket-Key'];
	$secAccept = base64_encode(pack('H*', sha1($secKey . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
	$upgrade  = "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" .
	"Upgrade: websocket\r\n" .
	"Connection: Upgrade\r\n" .
	"WebSocket-Origin: $host\r\n" .
	"WebSocket-Location: ws://$host:$port/demo/shout.php\r\n".
	"Sec-WebSocket-Accept:$secAccept\r\n\r\n";
	socket_write($client_conn,$upgrade,strlen($upgrade));
}
?>