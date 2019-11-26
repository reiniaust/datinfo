var datenUrl = "http://" + location.hostname + ":" + location.port + "/datinfo/daten.php";
var dataGrid;
var ajaxDaten;
var struktur;
var daten;
var beziehungen;
var keyName;
var param = {};
var editieren;
var mainTblName;
var unterTab;
var selMode;
var selectedRowsData;
var btnCopy;
var copiedData;
var childTblName;
var fremdIDName;
var fremdIDWert;
var dataShow;

DevExpress.localization.locale("de"); // deutsche Sprache
Globalize.locale("de");
DevExpress.config({
    defaultCurrency: "EUR"
});

mainTblName = getUrlVars()["tabelle"];

/*
if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;
        
        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}
*/

$("#searchInput").keyup(function () {
    //daten = dataGrid.option("dataSource");
    var toSearch = $("#searchInput").val().toLowerCase();
    dataShow = [];
    daten.forEach(function(row) {
        var wordsFound = true;
        toSearch.split(" ").forEach(function(word) {
            if (wordsFound) {
                var wordFound = false;
                Object.keys(row).forEach(function(key) {
                    if (!wordFound) {
                        var value = row[key];
                        //13.11. if (value && value.toString().toLowerCase().includes(word)) {
                        if (value && value.toString().toLowerCase().indexOf(word) >= 0) {
                            wordFound = true;
                        } else {
                            if (beziehungen[key]) {
                                //13.11. var fRow = ajaxDaten[beziehungen[key]].find(function(f) {return f["ID"] == value});
                                var fRow = ajaxDaten[beziehungen[key]].filter(function(f) {return f["ID"] == value})[0];
                                //if (fRow && fRow["Bezeichnung"] && fRow["Bezeichnung"].toLowerCase().includes(word)) {
                                if (fRow && fRow["Bezeichnung"] && fRow["Bezeichnung"].toLowerCase().indexOf(word) >= 0) {
                                    wordFound = true;
                                }
                            }
                        }
                    }
                });
                if (!wordFound) {
                    wordsFound = false;
                }
            }
        });
        if (wordsFound) {
            dataShow.push(row);
        }
    });
    anwenden();
}); 

einlesenUndAnwenden();

function einlesenUndAnwenden(params) {

    //param.aktion = "select";
    param.tabelle = mainTblName;

    ajaxAusfuehren();
    anwenden();
}

function anwenden() {

    
    selectedRowsData = null;
    
    var spalten = [];
    editieren = {};
    
    if (!mainTblName) {
        
        // Anzeige und Auswahl der Tabellen bzw. Listen
        $("#searchInput").hide();
        daten = [];
        keyName = "Name";
        Object.keys(ajaxDaten.Tabellen).forEach(function(name) {
            daten.push({Name: name});
        });
        spalten = [{dataField: "Name"}];
        selMode = "single";
        dataShow = daten;

    } else {

        // Anzeige und Editiermöglichkeit der ausgewählten Tabellen
        
        $("#hTitel").html(mainTblName);

        $("#searchInput").show();

        struktur = ajaxDaten.Tabellen[mainTblName];

        spalten = spaltenDef(struktur);

        if (struktur.Editierbar) {
            editieren = {
                allowUpdating: true, 
                allowAdding: true,
            };
        }

        if (mainTblName == "Teile") { // 25.11.
            selMode = "multiple";
        }

        // Unter-Tabelle prüfen und dartsellen
        Object.keys(ajaxDaten.Tabellen).forEach(function(name) {
            if (name != mainTblName && name.indexOf(mainTblName) == 0) {
                var tabDef = ajaxDaten.Tabellen[name];
                Object.keys(ajaxDaten.Beziehungen).forEach(function(bezieh) {
                    if (ajaxDaten.Beziehungen[bezieh] == mainTblName) {
                        fremdIDName = bezieh;
                    }
                });
                unterTab = {
                    enabled: true,
                    template: function(container, options) { 
                        var childDaten = ajaxDaten[name];
                        childTblName = name;
                        fremdIDWert = options.key;
                        
                        //btnCopy = $("<div>").dxButton({ 
                        $("<div>").dxButton({ 
                            text: "Kopieren",
                            onClick: function(e) {
                                if (!selectedRowsData) {
                                    alert("Bitte zuerst Datensätze markieren.")
                                } else {
                                    copiedData = selectedRowsData;
                                    anwenden();
                                }
                            }
                        }).appendTo(container);

                        $("<div>").dxDataGrid({
                            columnAutoWidth: true,
                            dataSource: new DevExpress.data.DataSource({
                                store: new DevExpress.data.ArrayStore({
                                    key: "ID",
                                    data: childDaten
                                }),
                                filter: [fremdIDName, "=", fremdIDWert]
                            }),
                            columns: spaltenDef(tabDef, fremdIDName),
                            selection: { 
                                mode: selMode
                            },
                            onSelectionChanged: function (selectedItems) {
                                selectedRowsData = selectedItems.selectedRowsData;
                            },
                            editing: {
                                allowUpdating: true, 
                                allowAdding: true,
                                allowDeleting: true
                            },
                            onRowInserted: function(e) {
                                setParameterAndSave(e, "insert");
                            },
                            onRowUpdated: function(e) {
                                param.aktion = "update";
                                param.ID = e.key;
                                param.daten = e.data;
                                param.parentID = fremdIDWert;
                                param.speicherTabelle = childTblName;
                    
                                ajaxAusfuehren();
                                anwenden();
                            },
                            onRowRemoved: function(e) {
                                param.aktion = "delete";
                                param.ID = e.key;
                                param.daten = e.data;
                                param.speicherTabelle = childTblName;
                    
                                ajaxAusfuehren();
                                anwenden();
                            }
                        }).appendTo(container);
                    }
                }
            }
        });
    }

    function spaltenDef(struktur, auslassen) {
        var sp = [];
        Object.keys(struktur.Spalten).forEach(function(spalte) {
            var feld = {};
            feld.dataField = spalte;
            if (spalte != "Auftrag") {
                feld.format = "#,###";
            }
            if (spalte == "ID") {
                keyName = "ID";
                feld.allowEditing = false;
                if (!struktur.IdKeinAutoWert) {
                    feld.width = 0; // 25.11.
                }
            }
            if (struktur.Typen && struktur.Typen[spalte]) {
                feld.dataType = struktur.Typen[spalte];            
            }
            if (beziehungen[spalte]) {
                feld.lookup = {
                    dataSource: ajaxDaten[beziehungen[spalte]],
                    valueExpr: "ID",
                    displayExpr: "Bezeichnung"
                }
            }
            feld.calculateSortValue = function (row) {
                // KW-Datums-Sortierung
                if (row[spalte]) {
                    if (row[spalte].length == 8 && row[spalte].substring(2, 3) == "." | row[spalte].substring(5, 6) == ".") {  // wenn Termin-String
                        var date = row[spalte].substring(6, 8);
                        if (row[spalte].substring(5, 6) == ".") { // wenn Tag oder Monat
                            date += row[spalte].substring(3, 5) + row[spalte].substring(0, 2);
                        } else {
                            if (row[spalte].substring(3, 5) == "KW") {
                                var d = getDateOfISOWeek(row[spalte].substring(0, 2), date);
                                date += (d.getMonth() + 101).toString().substring(1, 3) + (d.getDate() + 101).toString().substring(1, 3);       
                            }
                        }
                        return date;
                    } else { 
                        return row[spalte]; 
                    }
                } else { 
                    return ""; 
                }
            }
            if (!auslassen || auslassen != spalte) {
                sp.push(feld);
            }
        });
        return sp;
    }

    //25.11. if (mainTblName == "Lagerbestand") {
    if (mainTblName == "Umsatz") {

        var pivotGridChart = $("#pivotgrid-chart").dxChart({
            commonSeriesSettings: {
                type: "bar"
            },
            tooltip: {
                enabled: true,
                format: "currency",
                customizeTooltip: function (args) {
                    return {
                        html: args.seriesName + " | Total<div class='currency'>" + args.valueText + "</div>"
                    };
                }
            },
            size: {
                height: 200
            },
            adaptiveLayout: {
                width: 450
            }
        }).dxChart("instance");

        var pivotGrid = $("#pivotgrid").dxPivotGrid({
            allowSortingBySummary: true,
            allowFiltering: true,
            showBorders: true,
            showColumnGrandTotals: false,
            showRowGrandTotals: false,
            showRowTotals: false,
            showColumnTotals: false,
            headerFilter: {
                enabled: true,
                allowSearch: true
            },
            fieldChooser: {
                enabled: true,
                height: 800
            },
            dataSource: {
                fields: [{
                    dataField: "Kunde",
                    area: "row",
                    sortBySummaryField: "Total",
                    sortOrder: "desc"
                }, {
                    dataField: "Bezeichnung",
                    area: "row",
                    sortBySummaryField: "Total",
                    sortOrder: "desc"
                }, {
                    dataField: "Modellnummer",
                    area: "row",
                    sortBySummaryField: "Total",
                    sortOrder: "desc"
                }, {
                    dataField: "Zustand",
                    area: "column",
                }, {
                    dataField: "datum",
                    dataType: "date",
                    area: "column"
                }, {
                    caption: "Total",
                    dataField: "VK-Wert",
                    dataType: "number",
                    summaryType: "sum",
                    format: "currency",
                    area: "data"
                }],
                store: dataShow
            }
        }).dxPivotGrid("instance");

        pivotGrid.bindChart(pivotGridChart, {
            dataFieldsDisplayMode: "splitPanes",
            alternateDataFields: false
        });

    } else {
        dataGrid = $("#gridContainer").dxDataGrid({
            dataSource: dataShow,
            keyExpr: keyName,
            columns: spalten,
            filterRow: { visible: true },
            columnAutoWidth: true,
            editing: editieren,
            selection: {
                mode: selMode
            },
            groupPanel: {
                visible: true
            },
            grouping: {
                autoExpandAll: false
            },
            summary: {
                groupItems: [{
                    column: "Gewicht",
                    summaryType: "sum",
                    alignByColumn: true,
                    valueFormat: "#,###",
                    displayFormat: "{0} kg"
                }, {
                    column: "VK-Wert",
                    summaryType: "sum",
                    alignByColumn: true,
                    valueFormat: "#,###",
                    displayFormat: "{0} EUR"
                }, {
                    column: "Herstellkosten",
                    summaryType: "sum",
                    alignByColumn: true,
                    valueFormat: "#,###",
                    displayFormat: "{0} EUR"
                }],
                totalItems: [{
                    column: "Gewicht",
                    summaryType: "sum",
                    valueFormat: "#,###",
                    displayFormat: "{0} kg"
                }, {
                    column: "VK-Wert",
                    summaryType: "sum",
                    valueFormat: "#,###",
                    displayFormat: "{0} EUR"
                }, {
                    column: "Herstellkosten",
                    summaryType: "sum",
                    valueFormat: "#,###",
                    displayFormat: "{0} EUR"
                }]
            },
            onSelectionChanged: function (selectedItems) {
                if (selMode == "single") {
                    window.location.search += "tabelle=" + selectedItems.selectedRowsData[0].Name;        
                } else {
                    selectedRowsData = selectedItems.selectedRowsData;
                }
            },
            onRowUpdated: function(e) {
                param.aktion = "update";
                param.ID = e.key;
                param.daten = e.data;
                param.speicherTabelle = mainTblName;
    
                ajaxAusfuehren();
                anwenden();
            },
            onRowInserted: function(e) {
                param.aktion = "insert";
                param.daten = e.data;
                param.speicherTabelle = mainTblName;
    
                ajaxAusfuehren();
                anwenden();
            },
            masterDetail: unterTab
        }).dxDataGrid("instance");
    }


    $("#btnInsert").dxButton({ 
        //13.11. bei Baumgarte ? statt Umlaut  text: "Einfügen", 
        text: "Einf" + unescape("%FC") + "gen",
        visible: copiedData,
        onClick: function(e) {
            if (!selectedRowsData) {
                alert("Bitte zuerst Datensätze markieren.")
            } else {
                selectedRowsData.forEach(function(row) {
                    fremdIDWert = row.ID;
                    insertCopiedData();
                });
                copiedData = null;
                anwenden();
            }
        }
    });
}

function setParameterAndSave(e, action) {
    param.aktion = action;
    param.daten = e.data;
    param.daten[fremdIDName] = fremdIDWert;
    param.speicherTabelle = childTblName;
    ajaxAusfuehren();
    anwenden();
}

function insertCopiedData() {
    copiedData.forEach(function(row) {
        param.aktion = "insert";
        param.daten = row;
        param.daten[fremdIDName] = fremdIDWert;
        param.speicherTabelle = childTblName;
        ajaxAusfuehren();
    });
}

function ajaxAusfuehren() {
    $.ajax({
        type: "POST",
        dataType: "json",
        url: datenUrl,
        data: param,
        async: false,
        success: function(data) {
            ajaxDaten = data;
            //tabellen = data.Tabellen;
            daten = data.Daten;
            dataShow = daten;
            struktur = data.Struktur;
            beziehungen = data.Beziehungen;
            //waiting = false;
            //anwenden();
        }
    });
}

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

function getDateOfISOWeek(w, y) {
    var simple = new Date(y, 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}