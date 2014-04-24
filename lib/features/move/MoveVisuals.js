require('../../core/EventBus');
require('../../core/Canvas');
require('../../core/ElementRegistry');

require('../../draw/Snap');
require('../../draw/Styles');

require('../selection/Service');
require('../services/Rules');

require('../Outline');

require('./MoveEvents');

var Diagram = require('../../Diagram'),
    _ = require('lodash'),
    ShapeUtil = require('../../util/ShapeUtil');


/**
 * @class
 *
 * A plugin that makes shapes draggable / droppable.
 * 
 * @param {EventBus} events the event bus
 * @param {Selection} selection the selection service
 * @param {ElementRegistry} shapes the shapes service
 * @param {Canvas} canvas the drawing canvas
 * @param {Snap} snap
 * @param {Styles} styles
 * @param {Rules} the rule engine
 */
function MoveVisuals(events, selection, shapes, canvas, snap, styles, rules) {

  var paper;

  function getGfx(s) {
    return shapes.getGraphicsByShape(s);
  }

  function getVisualDragShapes(shapeList) {
    return ShapeUtil.selfAndDirectChildren(shapeList, true);
  }

  function getAllChildShapes(shapeList) {
    return ShapeUtil.selfAndAllChildren(shapeList, true);
  }

  function removeDropMarkers(gfx) {
    gfx
      .removeClass('drop-ok')
      .removeClass('drop-not-ok');
  }

  function addDropMarkers(gfx, canDrop) {
    var marker = canDrop ? 'drop-ok' : 'drop-not-ok';
    gfx.addClass(marker);
  }

  function addDragger(shape, dragGroup) {
    var gfx = shapes.getGraphicsByShape(shape);
    var dragger = gfx.clone();
    var bbox = gfx.getBBox();

    dragger.attr(styles.cls('djs-dragger', [], {
      x: bbox.x,
      y: bbox.y
    }));

    dragGroup.add(dragger);
  }

  events.on('shape.move.start', function(event) {

    var dragContext = event.dragContext,
        dragShapes = dragContext.shapes;

    var dragGroup = paper.group().attr('class', 'djs-drag-group').attr('pointer-events', 'none');

    var visuallyDraggedShapes = getVisualDragShapes(dragShapes),
        allDraggedShapes = getAllChildShapes(dragShapes);

    visuallyDraggedShapes.forEach(function(s) {
      addDragger(s, dragGroup);
    });

    // cache all dragged gfx
    // so that we can quickly undo their state changes later
    var allDraggedGfx = dragContext.allDraggedGfx = allDraggedShapes.map(getGfx);

    allDraggedGfx.forEach(function(gfx) {
      gfx.addClass('djs-dragging');
    });

    dragContext.selection = selection.getSelection();
    dragContext.dragGroup = dragGroup;

    // deselect shapes
    selection.select(null);
  });

  events.on('shape.move', function(event) {

    var dragContext = event.dragContext,
        delta = dragContext.delta,
        dragGroup = dragContext.dragGroup;

    dragGroup.translate(delta.x, delta.y);
  });

  events.on('shape.move.over', function(event) {
    var dragContext = event.dragContext,
        gfx = event.gfx;

    var canDrop = rules.can('drop', dragContext);

    addDropMarkers(gfx, canDrop);
  });

  events.on('shape.move.out', function(event) {
    var gfx = event.gfx;
    removeDropMarkers(gfx);
  });

  events.on('shape.move.end', function(event) {

    var dragContext = event.dragContext,
        allDraggedGfx = dragContext.allDraggedGfx,
        dragGroup = dragContext.dragGroup;

    // cache all dragged gfx
    if (allDraggedGfx) {
      allDraggedGfx.forEach(function(gfx) {
        gfx.removeClass('djs-dragging');
      });
    }

    dragGroup.remove();
    
    if (dragContext.hoverGfx) {
      removeDropMarkers(dragContext.hoverGfx);
    }

    // restore selection
    selection.select(dragContext.selection);
  });


  // load paper from initialized canvas
  
  events.on('canvas.init', function(event) {
    paper = event.paper;
  });

  events.on('diagram.destroy', function() {
    paper = null;
  });
}

Diagram.plugin('moveVisuals', [
  'eventBus', 'selection', 'elementRegistry', 'canvas', 'snap', 'styles', 'rules', 'moveEvents', MoveVisuals
]);

module.exports = MoveVisuals;