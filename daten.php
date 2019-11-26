<?PHP
	header('Access-Control-Allow-Origin: *');
    
    //$server = "pcra2014";
    //$connectionInfo = array( "Database"=>"SDSOFTWARE");
    include "conn.php";

	// Mit MSSQL verbinden
	$conn = sqlsrv_connect($server, $connectionInfo);

	if (!$conn) {
		echo "Beim Aufbau der Verbindung mit MSSQL ging etwas schief";
		echo print_r( sqlsrv_errors(), true);
	}

    $out["Tabellen"] = array(
        'Sonderposten' => array(
            'Tabelle' => '[I-Sonderposten]', 
            'Spalten' => array('ID' => 'Nummer', 'Bezeichnung' => 'Bezeichnung'),
            'IdKeinAutoWert' => 1
        ),
        'Werkstoffe' => array(
            'Tabelle' => 'Werkstoffe', 
            'Spalten' => array('ID' => 'WerkstoffID', 'Bezeichnung' => 'WerkstoffBez'),
            'IdKeinAutoWert' => 1
        ),
        'Kunden' => array(
            'Tabelle' => 'Debitor', 
            'Spalten' => array('ID' => 'KundenNr', 'Bezeichnung' => 'NameKurz'),
            'IdKeinAutoWert' => 1,
            'Untertabellen' => array(
                'Ansprechpartner' => array(
                    'Tabelle' => 'Ansprechpartner', 
                    'Spalten' => array('ID' => 'AnspID', 'Kunde' => 'KDNr', 'Bezeichnung' => 'Ansprechpartner')
                )
            )
        ),
        'Teile' => array(
            'Tabelle' => 'Teile', 
            'Spalten' => array('ID' => 'TeileNr', 'Kunde' => 'KundenNr', 'Bezeichnung' => 'ModellBez', 'Modellnummer' => 'ModellNr', 'Werkstoff' => 'WerkstoffID', 'Rohgewicht (kg)' => 'GewRoh', 'StProVPE' => 'StProVPE'),
            'IdKeinAutoWert' => 1,
			'Kriterium' => 'WHERE TeilGeloescht = 0'
        ),
        'Teile-Verpackungen' => array(
            'Tabelle' => '[Teil-Packmittel]', 
            'Spalten' => array('ID' => 'SatzId', 'Teil' => 'TeileNr', 'Packmittel' => 'Packmittel', 'Anzahl' => 'PackAnzahl')
        ),
        'Putzerei-Abarbeitungsliste' => array(
            'Tabelle' => 'v_PutzAbarbeitung', 
            'Spalten' => array('ID' => 'MengenID', 'Auftrag' => 'AuftrNr', 'Kunde' => 'KundenNr', 'Bezeichnung' => 'ModellBez', 'Modellnummer' => 'ModellNr', 'Giessdatum' => 'MaxDatum', 'Stueckzahl' => 'Menge', 'Kennz' => 'Kennz', 'Liefertermin' => 'BTermin', 'Naechster AG' => 'NaechsterAG', 'Vermerk' => 'PosText'),
            'Editierbar' => array('Tabelle' => '[Auf-LAB]', 'Spalten' => array('PosText'))
        ),
        /*'Lagerbestand' => array(
            'Tabelle' => 'v_LagerbestandTermin', 
            'Spalten' => array('ID' => 'MengenID', 'Auftrag' => 'AuftrNr', 'Bezeichnung' => 'ModellBez', 'Modellnummer' => 'ModellNr', 'Zustand' => 'Zustand', 'Menge' => 'Menge', 'Gewicht' => 'ROUND(Gewicht, 0)', 'VK-Wert' => 'ROUND(VkWert, 0)', 'Bestellmenge' => 'BMenge', 'Liefertermin' => 'BTermin')
        )*/
        'Lagerbestand' => array(
            'Tabelle' => 'v_Lagerbestand_HK', 
            'Spalten' => array('Auftrag' => 'AuftrNr', 'Kunde' => 'KundenNr', 'Bezeichnung' => 'ModellBez', 'Modellnummer' => 'ModellNr', 'Zustand' => 'Zustand', 'Menge' => 'Menge', 'Gewicht' => 'ROUND(Gewicht, 0)', 'VK-Wert' => 'ROUND(VkWert, 0)', 'Herstellkosten' => 'ROUND(Kosten, 0)')
        )
    );

    $out["Beziehungen"] = array(
        'Kunde' => 'Kunden',
        'Werkstoff' => 'Werkstoffe',
        'Teil' => 'Teile',
        'Packmittel' => 'Sonderposten',
        'Kernanlage' => 'Kernanlagen'  
    );

    if (isset($_POST["tabelle"])) {
        if (isset($_POST["speicherTabelle"])) {
            $tab = $out["Tabellen"][$_POST["speicherTabelle"]];
        }
    
        if (isset($_POST["aktion"]) && $_POST["aktion"] == "insert") {
            $sql = "SELECT MAX(" . $tab['Spalten']['ID'] . ") AS MaxID FROM ". $tab['Tabelle'];
            $result = sqlsrv_query( $conn, $sql);
            $id = 1;
            while( $row = sqlsrv_fetch_array( $result, SQLSRV_FETCH_ASSOC))
            {
                $id = $row["MaxID"] + 1;
            }
            if (isset($tab['IdKeinAutoWert']) && $tab['IdKeinAutoWert'] == 1) {
                $sql = "INSERT INTO " . $tab['Tabelle'] . " (" . $tab['Spalten']['ID'] . ") VALUES (" . $id . ")";
            } else {
                foreach ($_POST["daten"] as $key => $wert) {
                    if (gettype($wert) == "string") {
                        $wert = "'" . $wert . "'";
                    };
                    if ($key != "ID") {
                        $sql = "INSERT INTO " . $tab['Tabelle'] . " (" . $tab['Spalten'][$key] . ") VALUES (" . $wert . ")";
                        break;
                    }
                }
            }
            
            $result = sqlsrv_query( $conn, $sql);
        }
    
        if (isset($_POST["aktion"]) && ($_POST["aktion"] == "update" | $_POST["aktion"] == "delete")) {
            $id = $_POST['ID'];
        }
        
        if (isset($id)) {
            $dbTab = $tab['Tabelle'];
            foreach ($_POST["daten"] as $key => $wert) {
                if ($key != "ID") {
                    $updaten = true;
                    if ($_POST["aktion"] == "delete") {
                        $valueName = "AlterWert";
                    } else {
                        $tabFeld = $tab['Spalten'][$key];
                        if (isset($tab['Editierbar'])) {
                            $dbTab = $tab['Editierbar']['Tabelle'];
                            /*
                            if (isset($tab['Editierbar']['Spalten'][$tabFeld])) {
                            } else {
                                $updaten = false;
                            }
                            */
                        }
                        if ($updaten) {
                            //13.11. if (gettype($wert) == "string") {
                            if (!is_numeric($wert)) {
                                $out['test'] = $wert;
                                $wert = "'" . $wert . "'";
                            };
                            //$sql = "UPDATE " . $tab['Tabelle'] . " SET " . $tab['Spalten'][$key] . " = " . $wert . " WHERE " . $tab['Spalten']['ID'] . " = " . $id;
                            $sql = "UPDATE " . $dbTab . " SET " . $tabFeld . " = " . $wert . " WHERE " . $tab['Spalten']['ID'] . " = " . $id;
                            $valueName = "NeuerWert";
                            $result = sqlsrv_query($conn, $sql);
                        }
                    }
                    if ($updaten) {
                        $sql = "INSERT INTO AendProt (DatumZeit, Programm, Formular, IDWert, Feldname, " . $valueName . ") VALUES (GETDATE(), 'datinfo', '" . $dbTab . "', " . $id . ", '" . $tab['Spalten'][$key] . "', " . $wert . ")";
                        $result = sqlsrv_query($conn, $sql);
                    }
                } else {
                    if ($_POST["aktion"] == "delete") {
                        $sql = "DELETE FROM " . $dbTab . " WHERE " . $tab['Spalten']['ID'] . " = " . $id;
                    }
                }
                $out['sql'] = $sql;
            }
        }

        $tabName = $_POST["tabelle"];
        $tab = $out["Tabellen"][$tabName];

        // Einlesen
        $out['Daten'] = selectErgebnis($tab);

        // Unter-Tabellen (z.B. "Teile-Tabellen" ist Unter-Tabelle von "Teile")
        foreach ($out["Tabellen"] as $liste => $tabelle) {
            if (startsWith($liste, $tabName)) {
                $out[$liste] = selectErgebnis($tabelle);
            }
        }
    }

    echo json_encode($out);

    
    function selectErgebnis($tab) {
        global $conn, $out;

        $sql = "SELECT ";
        foreach ($tab['Spalten'] as $key => $spalte) {
            $sql .= $spalte . " AS [" . $key ."], ";
        }
        $sql = substr($sql, 0, -2) . " FROM " . $tab['Tabelle'];
		if (isset($tab["Kriterium"])) {
			$sql .= " " . $tab["Kriterium"];
        }
    
        $result = sqlsrv_query( $conn, $sql);
                    
        $daten = array();
        while( $row = sqlsrv_fetch_array( $result, SQLSRV_FETCH_ASSOC))
        {
            foreach($row as $key => $value) {
                if (gettype($row[$key]) == "string") {
                    $row[$key] = iconv("ISO-8859-1", "UTF-8", $row[$key]);
                };
                if (gettype($row[$key]) == "object") {
                    $row[$key] = $row[$key]->format('Y-m-d');
                };
            }
            array_push($daten, $row);
        } 

        // Die Beziehungs-Tabellen einlesen (z.B. wenn Teile dann auch Werkstoffe)
        foreach ($tab['Spalten'] as $key => $spalte) {
            if (isset($out['Beziehungen'][$key])) {
                $beziehTab = $out["Tabellen"][$out['Beziehungen'][$key]];
                $out[$out['Beziehungen'][$key]] = selectErgebnis($beziehTab);
            }
        }

        return $daten;
    }

    function startsWith ($string, $startString) 
    { 
        $len = strlen($startString); 
        return (substr($string, 0, $len) === $startString); 
    } 

?>