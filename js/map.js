$(document).ready(function () {
  require([
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/Home",
    "esri/widgets/Expand",
    "esri/widgets/Legend",
    "esri/widgets/LayerList",
    "esri/geometry/Extent",
    "esri/geometry/Polygon",
  ], function (FeatureLayer, GraphicsLayer, Graphic, Map, MapView, Home, Expand, Legend, LayerList, Extent, Polygon) {

    // ---------- Global Variables ----------
    hoverGeom = null;
    clickGeom = null; //locGeom
    subCorridor = null;

    subCorrSQL = "1=1";
    directionSQL = "1=1";
    sqlFilter = "1=1";

    // ---------- Map Layers ----------
    corridors = new FeatureLayer({
      url: "https://gisstg.massdot.state.ma.us/arcgis/rest/services/ODMatrix/ManagedLaneSections/MapServer/0",
      outFields: ["*"],
      id: "corridors",
      visible: true,
      title: "MLS Corridors",
      popupEnabled: true,
      popupTemplate: {
        title: "SubCorridor: {SubSegment}",
        content: "TEST"
      }
    });
    corridors.when(function() {
      zoomToLayer(corridors);
    });
    highlightGraphics = new GraphicsLayer({
      title: "Highlighted GraphicsLayer",
      listMode: "hide"
    });
    clickGraphics = new GraphicsLayer({
      title: "Clicked GraphicsLayer",
      listMode: "hide"
    });
    var lineHighlight1 = new Graphic();
    var lineHighlight2 = new Graphic();
    var lineHighlight3 = new Graphic();
    var lineHighlight4 = new Graphic();
    lineHighlight1.symbol = {
      type: "simple-line",
      color: [255, 255, 255, 0.8],
      width: 1
    };
    lineHighlight2.symbol = {
      type: "simple-line",
      color: [245, 147, 0, 0.5],
      width: 5
    };
    lineHighlight3.symbol = {
      type: "simple-line",
      color: [240, 154, 15, 0.2],
      width: 7
    };
    lineHighlight4.symbol = {
      type: "simple-line",
      color: [227, 166, 22, 0.1],
      width: 8
    };
    lineSymbol = [lineHighlight1.symbol, lineHighlight2.symbol, lineHighlight3.symbol, lineHighlight4.symbol];

    map = new Map({
      basemap: "dark-gray",
    });
    map.addMany([corridors, highlightGraphics, clickGraphics])
    view = new MapView({
      map: map,
      container: "viewDiv",
      popup: {
        autoOpenEnabled: false, // false hides popup in map
      },
      spatialReference: {
        wkid: 3857
      },
      highlightOptions: {
        color: [255,165,0], //orange
        fillOpacity: 0.4
      }
    });

    // ---------- Map Functionality ----------
    homeWidget = new Home({
      view: view
    });
    legend = new Expand({
      content: new Legend({
        view: view,
        style: "card",
        layerInfos: [{
          layer: corridors,
        }]
      }),
      view: view,
      expanded: false
    });
    layerList = new Expand({
      content: new LayerList({
        view: view,
        style: "card",
        layerInfos: [{
          layer: corridors,
        }]
      }),
      view: view,
      expanded: false
    });
    view.ui.add([
      {
        component: homeWidget,
        position: "top-left",
        index: 1
      }, {
        component:layerList,
        position: "top-left",
        index: 2
      }, {
        component:legend,
        position: "top-left",
        index: 3
      }
    ]);
    $(document).on("click", ".esri-home", function(){
      view.goTo(initExtent);
    });

    view.when().then(function() {
      layer = corridors;
      view.whenLayerView(layer).then(function(layerView) {
        view.on("pointer-move", function(event) {
          view.hitTest(event).then(function(response) {
            if(response.results.length>0) {
                var geom = response.results[0].graphic.geometry
                highlightLine(geom, 'hover')
              } else {
                highlightGraphics.removeAll();
              }
          })
        });
        view.on("click", function(event) {
          clickGraphics.removeAll();
          var extentGeom = pointToExtent(view, event.mapPoint, 10);
          function pointToExtent(view, point, toleranceInPixel) {
            var pixelWidth = view.extent.width / view.width; //calculate map coords represented per pixel
            var toleranceInMapCoords = toleranceInPixel * pixelWidth; //calculate map coords for tolerance in pixel
            var extent = new Extent(point.x - toleranceInMapCoords, point.y - toleranceInMapCoords, point.x + toleranceInMapCoords, point.y + toleranceInMapCoords, view.spatialReference)
            return extent
          };
          var polygon = Polygon.fromExtent(extentGeom);

          var layerQuery = layer.createQuery();
          layerQuery.returnGeometry = true;
          layerQuery.outFields = ["*"];
          layerQuery.outSpatialReference = view.spatialReference;
          layerQuery.geometry = polygon;
          layerQuery.spatialRelationship = "intersects";

          layer.queryFeatures(layerQuery).then(function(results) {
            // console.log("Results:", results.features);
            if (results.features.length>0) {
              highlightLine(results.features[0].geometry, 'click')
              subCorridor = results.features[0].attributes.SubSegment
              console.log('SubCorridor:', subCorridor);
              $("#subCorrSelect").val(subCorridor);
              updateSQL(subCorridor);
            } else {
              highlightGraphics.removeAll();
            }
          });
        });
      })
    });




    // ---------- Custom Functions ----------
    function zoomToLayer(layer) {
      return layer.queryExtent().then(function (response) {
        view.goTo(response.extent)
        .then(function() {
          initExtent = view.extent;
          initZoom = view.zoom
        })
        .catch(function (error) {
          if (error.name != "AbortError") {
            console.error(error);
          };
        });
      });
    };

    function highlightLine(geometry, hitEvent) {
      highlightGraphics.removeAll();
      for(var i=0; i<lineSymbol.length; i++) {
        var highlightGraphic = new Graphic({
          geometry: geometry,
          symbol: lineSymbol[i]
        });
        if (hitEvent == 'hover') {
          highlightGraphics.add(highlightGraphic);
        } else if (hitEvent == 'click') {
          clickGraphics.add(highlightGraphic);
        }
      };
    };

    function getGeom(layer, attr, value) {
      layerQuery = layer.createQuery();
      layerQuery.where = attr + " = '" + value + "'";
      layerQuery.returnGeometry = true;
      layerQuery.outFields = ["*"];
      return layer.queryFeatures(layerQuery).then(function(results) {
        // console.log(results.features);
        var geom = results.features[0].geometry;
        // console.log("Geometry:", geom);
        return geom
      });
    };

    $("#subCorrSelect").change(function() {
      clickGraphics.removeAll();
      subCorridor = $("#subCorrSelect").val();
      updateSQL(subCorridor);
      getGeom(corridors, 'SubSegment', $("#subCorrSelect").val()).then(function(result) {
        highlightLine(result, 'click');
      })
    });

    function updateSQL(subCorr, direction) {
      getCorridor(subCorr).then(function(result) {
        corridor = result;
        console.log("Corridor:", corridor);
      });
      subCorrSQL = "Subcorridor='" + subCorr + "'";
      if (direction) {
        directionSQL = "Direction='" + direction + "'";
      }
      sqlFilter = subCorrSQL + " AND " + directionSQL
      console.log('SQL:', sqlFilter)
    };

    function getCorridor(subCorr) {
      layerQuery = corridors.createQuery();
      layerQuery.where = "SubSegment = '" + subCorr + "'";
      layerQuery.returnGeometry = false;
      layerQuery.outFields = ["Route_ID"];
      return corridors.queryFeatures(layerQuery).then(function(results) {
        var corr = results.features[0].attributes.Route_ID;
        return corr
      });
    };




  });
});
