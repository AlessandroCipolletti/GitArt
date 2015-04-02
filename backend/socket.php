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
				error_log("ricevuto: ".strlen($buf));
				$data = json_decode(unmask($buf));
				error_log("unmasked: ".strlen(unmask($buf)));
				if ($data->type == "SAVE") {
					error_log("devo salvare");
					$base64 = $data->draw->data;
					$minX = $data->draw->coordX;
					$minY = $data->draw->coordY;
					$w = $data->draw->w;
					$h = $data->draw->h;
					$maxX = $minX + $w;
					$maxY = $minY + $h;
					$x = $data->x;
					$y = $data->y;
					
					$sql = "INSERT INTO $tableDraw (data, maxX, maxY, minX, minY, x, y, w, h) VALUES ('$base64', '$maxX', '$maxY', '$minX', '$minY', '$x', '$y', '$w', '$h')";
					if (mysql_query($sql)) {
						$response = mask(json_encode(array('type'=>'SAVE_RESPONSE', 'ok'=>true, 'id'=>mysql_insert_id())));
						error_log("salvato");
					} else {
						$response = mask(json_encode(array('type'=>'SAVE_RESPONSE', 'ok'=>false)));
					}
					send_message($_socket, $response);
					
				} else if ($data->type == "DRAG") {
					$minX = $data->area->minX + 50;
					$minY = $data->area->minY + 50;
					$maxX = $data->area->maxX - 50;
					$maxY = $data->area->maxY - 50;
					$x = $data->area->x;
					$y = $data->area->y;
					$ids = implode($data->ids, ',');
					if (strlen($ids)) {
						$ids = "id NOT IN ($ids) AND";
					} 
					$sql = "SELECT * FROM $tableDraw WHERE $ids (maxX > $minX AND minX < $maxX AND maxY > $minY AND minY < $maxY)";
					$q = mysql_query($sql);
					if ($q) {
						error_log(mysql_num_rows($q)." disegni for drag");
						$d = mysql_fetch_array($q);
						while ($d) {
							$ris[] = array(
								"id"		=> intval($d['id']),
								"data"		=> $d['data'],
								"w"			=> intval($d['w']),
								"h"			=> intval($d['h']),
								"x"			=> intval($d['minX']),
								"y"			=> intval($d['minY'])
							);
							$response = array(
								"type" => "DRAG",
								"draws" => $ris
							);
							$s = mask(json_encode($response));
							send_message($_socket, $s);
							$ris = NULL;
							$d = mysql_fetch_array($q);
						}
						$ris = $d = $q = $sql = $s = $response = false;
					} else {
						error_log("ERRORE SELECT");
					}
				}
				break 2;
			}
			// KO - la disconnessione su firefox e chrome avviene in ritardo
			$buf = @socket_read($changed_socket, 1024, PHP_NORMAL_READ);
			if ($buf === false) {
				$found_socket = array_search($changed_socket, $clients);
				unset($clients[$found_socket]);
				error_log("disconnesso");
			}
		}
		sleep(0.5);
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
	elseif($length >= 65536) {
		
		//$header = pack('CCNN', $b1, 127, $length);
		$b1 = 1;
		$length = strlen($text);
		$b2 = 127;
		$hexLength = dechex($length);
		if (strlen($hexLength)%2 == 1) {
			$hexLength = '0' . $hexLength;
		}
		$n = strlen($hexLength) - 2;

		for ($i = $n; $i >= 0; $i=$i-2) {
			$lengthField = chr(hexdec(substr($hexLength, $i, 2))) . $lengthField;
		}
		while (strlen($lengthField) < 8) {
			$lengthField = chr(0) . $lengthField;
		}
		return chr($b1) . chr($b2) . $lengthField . $text;
    
	}
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