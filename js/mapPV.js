$(document).ready(function () {
  require([
    "esri/layers/MapImageLayer",
    "esri/widgets/BasemapGallery",
    "esri/tasks/QueryTask",
    "esri/tasks/support/Query",
    "esri/widgets/Feature",
    "esri/geometry/support/webMercatorUtils"
  ], function (MapImageLayer, BasemapGallery, QueryTask, Query, Feature, webMercatorUtils) {

    locName = "All";

    queryTask = new QueryTask({
      url: "https://gis.massdot.state.ma.us/rh/rest/services/Projects/CIPCommentTool/MapServer/6"
    });

    function updateSQL() {
      sqlFilters = divisionSQL + " AND " + programSQL
      + " AND " + costMinSQL + " AND " + costMaxSQL
    };
    // updateSQL();

    stateExtent = new Polygon({
      rings: [
        [
          [-73.5, 42.5],
          [-73.5, 41.5],
          [-70, 42.5],
          [-70, 41.5]
        ]
      ],
      spatialReference: {
        wkid: 4326
      }
    });

    polySymbol = {
      type: "simple-fill",
      style: "none",
      outline: {
        color: [255, 255, 0, 1],
        width: "2.5px"
      }
    };


    // view.when(function() {
    //   console.log('initial toggle status:', $('.esri-layer-list__item-label').attr('aria-checked'))
    // });


    function filterLayers() {
      view.when(function () {
        if(locName !== "All") { // && locName !== 0
          getLocFilterProjects(locName); // if both non-spatial and spatial filters (e.g. Div=Highway, Town=Abington)
        } else {
          getPolyGeomProjects(); // if non-spatial filter(s) only (e.g. Div=Highway, Town=All)
        };
        $("#loadingScreen").css('display', 'none');
        view.map.layers.forEach(function (layer, index) {
          if(layer.title !== null) {
            layer.visible = true;
            view.whenLayerView(layer).then(function (layerView) {
              // console.log("Layer title:", layer.title);
              if(layer.title.includes('Projects')) {
                var layerQuery = layer.createQuery();
                if(!layer.title.includes('MBTA')) {
                  layerQuery.where = sqlFilters;
                  // console.log(layer.title + " where: " + layerQuery.where)
                } else {
                  layerQuery.where = "1=1";
                };

                layerQuery.returnGeometry = true
                layerQuery.outFields = ["*"]
                layerQuery.outSpatialReference = view.spatialReference

                if(locName !== "All") { // && locName !== 0
                  layerQuery.geometry = locGeom,
                  layerQuery.spatialRelationship = "intersects"
                };

                layer.queryFeatures(layerQuery)
                .then(function(results) {
                  if(layer.title.includes('MBTA')) {
                    if($("#divisionSelect").val() == 'MBTA' || $("#divisionSelect").val() == 'All'){
                      if(results.features.length>0) {
                        mbtaModes = ["System"];
                        mbtaDivisions = ["MBTA"];
                        mbtaFeatures = results.features;
                        // console.log("MBTA features:", mbtaFeatures)
                        filterMBTAlines(results);
                        projectMBTA.visible = true;
                      } else {
                        mbtaModes = [];
                        mbtaDivisions = [];
                        checkedMBTA = true;
                        checkLayers();
                        projectMBTA.definitionExpression = "1=0";
                      }
                    } else {
                      mbtaModes = [];
                      mbtaDivisions = [];
                      checkedMBTA = true;
                      checkLayers();
                      projectMBTA.definitionExpression = "1=0";
                    };
                    // console.log("MBTA project modes:", mbtaModes);
                  } else {
                    if(results.features.length>0) {
                      getProjects(results, layer.title);
                    } else if (results.features.length==0) {

                      if(layer.title.toLowerCase().includes('line')) {
                        lineDivisions = [];
                        checkedLines = true;
                        checkLayers();
                      } else if(layer.title.toLowerCase().includes('point')) {
                        pointDivisions = [];
                        checkedPoints = true;
                        checkLayers();
                      };
                      layer.definitionExpression = "1=0";
                    };
                    if(checkedLines==true && checkedPoints==true) {
                      getStatewideProjects();
                    };
                  };
                })
                .catch(function (error) {})
              };
            });
          };
        });
      });
    };

    function getProjects(results, title) {
      var divisionsArray = [];
      var projectIDs = [];
      var defExp = "ProjectID='";
      var features = results.features;
      for(var i=0; i<features.length; i++){
        var projDiv = features[i].attributes.Division;
        if(!divisionsArray.includes(projDiv)) {
          divisionsArray.push(projDiv)
        };
        var projectID = features[i].attributes.ProjectID;
        projectIDs.push(projectID);
        if(projectIDs.length>1) {
          defExp = defExp + " OR ProjectID='" + projectID + "'";
        } else {
          defExp = defExp + projectID + "'";
        };
      };
      if(title.toLowerCase().includes('line')) {
        if(locName=="All") { // || locName == 0
          projectLines.definitionExpression = sqlFilters;
        } else {
          projectLines.definitionExpression = defExp;
        }
        // console.log("Lines defExp:", projectLines.definitionExpression);
        for(var i=0; i<features.length; i++) {
          var pid = features[i].attributes.ProjectID;
          if(!lineProjects_ids.includes(pid)){
            lineProjects_ids.push(pid);
            lineProjects.push(features[i]);
          };
        };
        allProjects.push(lineProjects);
        projectTally = projectTally + features.length;
        // console.log("Line Projects:", lineProjects);
        lineDivisions = divisionsArray;
        checkedLines = true;
        checkLayers();
      } else if (title.toLowerCase().includes('point')) {
        if(locName=="All") { // || locName==0
          console.log("no spatial filters applied")
          projectPoints.definitionExpression = sqlFilters;
        } else {
          console.log('spatial filter applied')
          projectPoints.definitionExpression = defExp;
        }
        // console.log("Points defExp:", projectPoints.definitionExpression);

        for(var i=0; i<features.length; i++) {
          var pid = features[i].attributes.ProjectID;
          if(!pointProjects_ids.includes(pid)){
            pointProjects_ids.push(pid);
            pointProjects.push(features[i]);
          };
        };
        allProjects.push(pointProjects);
        projectTally = projectTally + features.length;
        // console.log("Point Projects:", pointProjects);
        pointDivisions = divisionsArray;
        checkedPoints = true;
        checkLayers();
      };
    };

    function checkLayers() {
      if(checkedLines == true && checkedPoints == true && checkedMBTA == true && checkedLocFilters == true && checkedStatewide == true) {
        checkStatewideDivs([pointDivisions, lineDivisions, mbtaDivisions, locationDivisions]);
      };
    };

    function getGeomFromLocSrc(uniqueRecord, locSrc) {
      console.log("unique record:", uniqueRecord);
      console.log("locSrc:", locSrc);
      if(locSrc=="MBTA") {
        var title = "MBTA Projects"
        var layer = layerFromTitle(title);
        if(uniqueRecord == 'System' || uniqueRecord == 'Commuter Rail' || uniqueRecord == 'Ferry' || uniqueRecord == 'Rapid Transit') {
          var extent = layer.fullExtent;
          var geometry = Polygon.fromExtent(extent);
          projectSearchID = false;
        };
        return geometry;
      } else {
        if(locSrc=="LINE") {
          var title = "Line Projects"
        } else if(locSrc=="POINT") {
          var title = "Point Projects"
        };
        var layer = layerFromTitle(title);
        getGeomFromId(layer, projectSearchID);
      };
    };


    function goToGeom(geometry) {
      view.goTo({
        target: geometry,
      });
      locExtent = geometry.extent;
      // console.log("locExtent:", locExtent);
    };


    $(".searchBtn").on("click", function() {
      console.log("clicked the search button");
      $("#projectSearch").val("");
      legend.expanded = false;
      $("#loadingScreen").css('display', 'block');
      $("#reopenList-btn").css("display", "none"); //4%
      $("#reopenPopup-btn").css("display", "none"); //4%
      $("#closePopup-btn").css("display", "none"); //4%
      clearCollections();
      updateSQL();
      console.log("locName:", locName);

      if(locName !== "All") { // && locName !== 0
        locQuery.returnGeometry = true;
        locQuery.outSpatialReference = view.spatialReference;

        locLayer.queryFeatures(locQuery).then(function(results) {
          locGeom = results.features[0].geometry;
          console.log("locGeom:", locGeom);
          // console.log(results.features[0].attributes)
          view.goTo({
            target: locGeom,
          });
          locExtent = locGeom.extent;
          polyGraphic = new Graphic({
            geometry:locGeom,
            symbol: {
              type: "simple-fill",
              color: [255, 255, 255, 0.2],
              style: "solid",
              outline: {
                color: [50, 50, 50, 0.8],
                width: "1px"
              }
            }
          });
          polyGraphics.removeAll();
          polyGraphics.add(polyGraphic);

          spatialQuery = "(Location LIKE '" + locName + "' OR Location='Statewide'" + " OR Location_Source LIKE '" + locName +  "' OR Location_Source='Statewide')";

          filterLayers();
        })
      } else {
        locName = 'All';
        locGeom = null;
        view.goTo({
          target: initialExtent,
          zoom: locZoom
        });
        locExtent = initialExtent;
        filterLayers();
      };
    });

    function popupFunction(feature) {
      // console.log(feature);
      var query = new Query({
        outFields: ["*"],
        where: "ProjectID = '" + feature.attributes.ProjectID + "'"
      });
      return queryTask.execute(query).then(function (result) {
        var attributes = result.features[0].attributes
        if (attributes.Division == "Highway") {
          link = "<a href='https://hwy.massdot.state.ma.us/projectinfo/projectinfo.asp?num=" + attributes.ProjectID + "' target=blank id='pinfoLink' class='popup-link' style='color: blue'>Additional Project Information.</a>"
        } else if (attributes.Division == "MBTA") {
          link = "<a href='https://www.mbta.com/projects' target=blank id='pinfoLink' class='popup-link'>Learn more about MBTA capital projects and programs.</a>"
        } else {
          link = ""
        }
        return "<p>This project was programmed by the " + attributes.Division + "</b> division within the <b>" + attributes.Program + "</b> CIP Program. It is located in <b>" + attributes.Location + "</b> and has a total cost of <b>" + numeral(attributes.Total).format('$0,0[.]00') + "</b>.</p>"
      });
    };

    view.when().then(function() {
      var graphic = {
        popupTemplate: {
          content: "Click a feature to show details..."
        }
      };
      popupFeature = new Feature({
        container: "popupContainer",
        graphic: graphic,
        map: view.map,
        spatialReference: view.spatialReference,
      }) // Provide graphic to a new instance of a Feature widget

      featureLayers = {};
      view.map.layers.forEach(function (layer, index) {
        // console.log(layer.title, ":", index);
        featureLayers[layer.title] = layer;
      });
      // console.log("All feature layers on map:", featureLayers);
    }); // template graphic for popup

    view.whenLayerView(projectLines).then(function(layerView){
      layerView.watch("updating", function(value) {
        if(!value) {
          $('.searchBtn').css('background-color', '#14558f').prop("disabled", false);
          $('.resetBtn').css('background-color', '#14558f').prop("disabled", false);
        }
      });
    });

    function getCurrentPopup(index) {
      highlightGraphics.removeAll();
      clickGraphics.removeAll();
      var feature = popupsShown[index];
      return feature;
    };

    function popupFromId(id, fromSearchBar=false) {
      console.log("projectID:", id);
      console.log("From searchBar @ top?", fromSearchBar);
      var clickQuery = projectList.createQuery();
      clickQuery.where = "ProjectID = '"+id+"'";
      // clickQuery.where = "ProjectID LIKE '%"+id+"%'"
      clickQuery.outFields = ["*"];
      // clickQuery.returnGeometry = true;
      projectList.queryFeatures(clickQuery).then(function(results) {
        var feature = results.features[0];
        console.log("feature:", feature);
        replacePopupGraphic(feature);

        queryProjectList(id);

        if(fromSearchBar==true) {
          var loc = feature.attributes.Location;
          var locSrc = feature.attributes.Location_Source;
          // var symbols = assignSymbols(feature.layer);
          getGeomFromLocSrc(loc, locSrc);

        }
      });
    };

    function queryProjectList(id) {
      var listQuery = projectList.createQuery();
      listQuery.where = "ProjectID = '"+id+"'";
      listQuery.outFields = ["*"];
      projectList.queryFeatures(listQuery).then(function(results){
        console.log(results.features)
        hoverLoc = results.features[0].attributes.Location;
        hoverMBTA_Loc = results.features[0].attributes.MBTA_Location;
        hoverLoc_Src = results.features[0].attributes.Location_Source;
        if(hoverLoc_Src!=="POINT" && hoverLoc_Src!=="LINE" &&  hoverLoc_Src!=="MBTA") {
          hoverGeom = stateExtent;
          goToGeom(hoverGeom);
          highlightGraphics.removeAll();
          clickGraphics.removeAll();
          $("#imageryAPI").css("display", "none");
        };
        var layer = getLayerFromSrc(id, hoverLoc, hoverMBTA_Loc, hoverLoc_Src);
        console.log("Layer:", layer);
        if (layer.title.includes('MBTA')) {
          var identifier = hoverMBTA_Loc;
        } else {
          var identifier = id;
        }
        getProjectGeom(identifier, layer);
        mbtaSymbols = assignSymbols(layer);
      });
    };

    function getProjectGeom(identifier, layer) {
      console.log(identifier, layer.title);
      var layerQuery = layer.createQuery();
      if(layer.title.includes('MBTA')) {
        layerQuery.where = "MBTA_Location LIKE '%"+identifier+"%'";
        hoverGeom = layer.fullExtent;
        goToGeom(hoverGeom);
      } else {
        layerQuery.where = "ProjectID= '"+identifier+"'";
      }
      layerQuery.outFields = ["*"];
      layerQuery.returnGeometry = true;
      layer.queryFeatures(layerQuery).then(function(results) {
        console.log(results.features[0]);
        if(results.features[0]) {
          hoverGeom = results.features[0].geometry;
          currentProjectHighlight(mbtaSymbols, hoverGeom);
          goToGeom(hoverGeom);
          googleStreetView(hoverGeom);
        } else {
          highlightGraphics.removeAll();
          clickGraphics.removeAll();
          $("#imageryAPI").css("display", "none");
        }

      })
    };

    function getLayerFromSrc(id, loc, mbta_loc, loc_src) {
      console.log("ID:", id, "Location:", loc, "\nMBTA Location:", mbta_loc, "\nLocation Source:", loc_src);
      // console.log('featureLayers:', featureLayers);
      var layers = Object.keys(featureLayers);
      // console.log('layers:', layers);
      return layers.forEach(function(layer) {
        // console.log(layer)
        if(layer.includes(loc_src)) {
          console.log(featureLayers[layer]);
          return featureLayers[layer];

        }
      });
    };

    function replacePopupGraphic(feature) {
      // console.log("Feature to replace popup:", feature);
      if(feature.attributes.ProjectID) {
        var featureID = feature.attributes.ProjectID;
        var featureDesc = feature.attributes.Project_Description;
        var currentProject_title = featureDesc + " - (" + featureID + ")";
        popupFeature.graphic.popupTemplate.title = currentProject_title;
        popupFeature.graphic.popupTemplate.content = popupFunction(feature);
      } else {
        var mbtaLoc = feature.attributes.MBTA_Location;
        popupFunctionMBTA(feature);
      };
      $("#reopenPopup-btn").css("display", "none");
      $("#closePopup-btn").css("display", "block"); //4%
      $("#projectModal").css("display", "block"); //37%
      $("#viewDiv").css("height", "59%");
    };

    $(document).on("click", "#closePopup-btn", function() {
      // console.log('close popup');
      $("#reopenPopup-btn").css("display", "block"); //4%
      $("#viewDiv").css("height", "96%")
    });

    function layerFromTitle(title){
      var layer = featureLayers[title];
      return layer;
    };

  });

});
