var ImageZoom = (function () {
  'use strict';

  // focus - focusOptions - preventScroll polyfill
  (function() {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof HTMLElement === "undefined"
    ) {
      return;
    }

    var supportsPreventScrollOption = false;
    try {
      var focusElem = document.createElement("div");
      focusElem.addEventListener(
        "focus",
        function(event) {
          event.preventDefault();
          event.stopPropagation();
        },
        true
      );
      focusElem.focus(
        Object.defineProperty({}, "preventScroll", {
          get: function() {
            supportsPreventScrollOption = true;
          }
        })
      );
    } catch (e) {}

    if (
      HTMLElement.prototype.nativeFocus === undefined &&
      !supportsPreventScrollOption
    ) {
      HTMLElement.prototype.nativeFocus = HTMLElement.prototype.focus;

      var calcScrollableElements = function(element) {
        var parent = element.parentNode;
        var scrollableElements = [];
        var rootScrollingElement =
          document.scrollingElement || document.documentElement;

        while (parent && parent !== rootScrollingElement) {
          if (
            parent.offsetHeight < parent.scrollHeight ||
            parent.offsetWidth < parent.scrollWidth
          ) {
            scrollableElements.push([
              parent,
              parent.scrollTop,
              parent.scrollLeft
            ]);
          }
          parent = parent.parentNode;
        }
        parent = rootScrollingElement;
        scrollableElements.push([parent, parent.scrollTop, parent.scrollLeft]);

        return scrollableElements;
      };

      var restoreScrollPosition = function(scrollableElements) {
        for (var i = 0; i < scrollableElements.length; i++) {
          scrollableElements[i][0].scrollTop = scrollableElements[i][1];
          scrollableElements[i][0].scrollLeft = scrollableElements[i][2];
        }
        scrollableElements = [];
      };

      var patchedFocus = function(args) {
        if (args && args.preventScroll) {
          var evScrollableElements = calcScrollableElements(this);
          this.nativeFocus();
          if (typeof setTimeout === 'function') {
            setTimeout(function () {
              restoreScrollPosition(evScrollableElements);
            }, 0);
          } else {
            restoreScrollPosition(evScrollableElements);          
          }
        }
        else {
          this.nativeFocus();
        }
      };

      HTMLElement.prototype.focus = patchedFocus;
    }
  })();

  var State;
  (function (State) {
      State["LOADED"] = "LOADED";
      State["UNLOADED"] = "UNLOADED";
      State["UNLOADING"] = "UNLOADING";
  })(State || (State = {}));
  var ARIA_LABEL = 'aria-label';
  var ARIA_LABELLEDBY = 'aria-labelledby';
  var ARIA_MODAL = 'aria-modal';
  var BUTTON = 'button';
  var CLICK = 'click';
  var DATA_RMIZ_OVERLAY = 'data-rmiz-overlay';
  var DATA_RMIZ_WRAP = 'data-rmiz-wrap';
  var DATA_RMIZ_ZOOMED = 'data-rmiz-zoomed';
  var DIALOG = 'dialog';
  var DIV = 'div';
  var FOCUS = 'focus';
  var ID = 'id';
  var KEYDOWN = 'keydown';
  var LOAD = 'load';
  var RESIZE = 'resize';
  var ROLE = 'role';
  var SCROLL = 'scroll';
  var STYLE = 'style';
  var TABINDEX = 'tabindex';
  var TRANSITIONEND = 'transitionend';
  var TRUE_STR = 'true';
  var ZERO_MS = '0ms';
  var ImageZoom = function (_a, targetEl) {
      var _b = _a === void 0 ? {} : _a, _c = _b.closeText, closeText = _c === void 0 ? 'Unzoom image' : _c, _d = _b.isControlled, isControlled = _d === void 0 ? false : _d, _e = _b.modalText, modalText = _e === void 0 ? 'Zoomed item' : _e, onZoomChange = _b.onZoomChange, _f = _b.openText, openText = _f === void 0 ? 'Zoom image' : _f, _g = _b.overlayBgColorEnd, overlayBgColorEnd = _g === void 0 ? 'rgba(255,255,255,0.95)' : _g, _h = _b.overlayBgColorStart, overlayBgColorStart = _h === void 0 ? 'rgba(255,255,255,0)' : _h, _scrollableEl = _b.scrollableEl, _j = _b.transitionDuration, transitionDuration = _j === void 0 ? '300ms' : _j, _k = _b.zoomMargin, zoomMargin = _k === void 0 ? 0 : _k, _l = _b.zoomZindex, zoomZindex = _l === void 0 ? 2147483647 : _l;
      var originalRole = getAttribute(ROLE, targetEl);
      var isDisplayBlock = window.getComputedStyle(targetEl).display === 'block';
      var isImgEl = targetEl.tagName === 'IMG';
      var isSvgSrc = isImgEl && SVG_REGEX.test(targetEl.currentSrc);
      var isImg = !isSvgSrc && isImgEl;
      var documentBody = document.body;
      var ariaHiddenSiblings = [];
      var closeBtnEl;
      var boundaryDivFirst;
      var boundaryDivLast;
      var modalEl;
      var motionPref;
      var openBtnEl;
      var scrollableEl = _scrollableEl || window;
      var state = State.UNLOADED;
      var targetCloneEl;
      var wrapEl;
      var zoomEl;
      var zoomImgEl;
      var init = function () {
          addEventListener(RESIZE, handleResize, window);
          initMotionPref();
          if (isImg && !targetEl.complete) {
              targetEl.addEventListener(LOAD, function () {
                  window.setTimeout(function () {
                      initImg();
                  }, 500);
              });
          }
          else {
              initImg();
          }
      };
      // START MOTION PREFS
      var initMotionPref = function () {
          motionPref = window.matchMedia('(prefers-reduced-motion:reduce)');
          motionPref.addListener(handleMotionPref); // NOT addEventListener because compatibility
      };
      var handleMotionPref = function () {
          transitionDuration = ZERO_MS;
      };
      var cleanupMotionPref = function () {
          motionPref === null || motionPref === void 0 ? void 0 : motionPref.removeListener(handleMotionPref); // NOT removeEventListener because compatibility
          motionPref = undefined;
      };
      // END MOTION PREFS
      var initImg = function () {
          if (!targetEl || state !== State.UNLOADED)
              return;
          var _a = targetEl.getBoundingClientRect(), height = _a.height, width = _a.width;
          var _b = targetEl, naturalHeight = _b.naturalHeight, naturalWidth = _b.naturalWidth;
          var currentScale = isImg && naturalHeight && naturalWidth
              ? getMaxDimensionScale(height, width, zoomMargin, naturalHeight, naturalWidth)
              : getScale(height, width, zoomMargin);
          if (currentScale > 1) {
              if (!targetCloneEl) {
                  targetCloneEl = targetEl.cloneNode(true);
                  wrapEl = createElement(DIV);
                  openBtnEl = createElement(BUTTON);
                  setAttribute(DATA_RMIZ_WRAP, '', wrapEl);
                  setAttribute(STYLE, isDisplayBlock ? styleWrapDiv : styleWrap, wrapEl);
                  setAttribute(ARIA_LABEL, openText, openBtnEl);
                  setAttribute(STYLE, styleZoomBtnIn, openBtnEl);
                  addEventListener(CLICK, handleOpenBtnClick, openBtnEl);
                  appendChild(targetCloneEl, wrapEl);
                  appendChild(openBtnEl, wrapEl);
                  replaceChild(targetEl.parentNode, targetEl, wrapEl);
              }
          }
          else {
              cleanupZoom();
              cleanupDOMMutations();
          }
      };
      var update = function (opts) {
          if (opts === void 0) { opts = {}; }
          if (opts.closeText)
              closeText = opts.closeText;
          if (opts.modalText)
              modalText = opts.modalText;
          if (opts.openText)
              openText = opts.openText;
          if (opts.overlayBgColorEnd)
              overlayBgColorEnd = opts.overlayBgColorEnd;
          if (opts.overlayBgColorStart)
              overlayBgColorStart = opts.overlayBgColorStart;
          if (opts.transitionDuration)
              transitionDuration = opts.transitionDuration;
          if (opts.zoomMargin)
              zoomMargin = opts.zoomMargin;
          if (opts.zoomZindex)
              zoomZindex = opts.zoomZindex;
          if (state === State.UNLOADED && opts.scrollableEl) {
              scrollableEl = opts.scrollableEl;
          }
          setZoomImgStyle();
          if (state === State.UNLOADED && opts.isZoomed) {
              zoom();
          }
          else if (state === State.LOADED && opts.isZoomed === false) {
              unzoom();
          }
      };
      // START CLEANUP
      var cleanup = function () {
          cleanupZoom();
          if (isImg && targetEl) {
              removeEventListener(LOAD, initImg, targetEl);
          }
          cleanupDOMMutations();
          cleanupMotionPref();
          removeEventListener(RESIZE, handleResize, window);
      };
      var cleanupDOMMutations = function () {
          if (openBtnEl) {
              removeEventListener(CLICK, handleOpenBtnClick, openBtnEl);
          }
          replaceChild(wrapEl === null || wrapEl === void 0 ? void 0 : wrapEl.parentNode, wrapEl, targetEl);
          openBtnEl = undefined;
          wrapEl = undefined;
          targetCloneEl = undefined;
      };
      var cleanupZoom = function () {
          var el = isImg ? zoomImgEl : zoomEl;
          if (el) {
              removeEventListener(TRANSITIONEND, handleUnzoomTransitionEnd, el);
              removeEventListener(TRANSITIONEND, handleZoomTransitionEnd, el);
              removeEventListener(LOAD, handleZoomImgLoad, el);
              removeChild(el, modalEl);
          }
          if (closeBtnEl) {
              removeEventListener(CLICK, handleCloseBtnClick, closeBtnEl);
          }
          if (boundaryDivFirst) {
              removeEventListener(FOCUS, handleFocusBoundaryDiv, boundaryDivFirst);
          }
          if (boundaryDivLast) {
              removeEventListener(FOCUS, handleFocusBoundaryDiv, boundaryDivLast);
          }
          if (modalEl) {
              removeEventListener(CLICK, handleModalClick, modalEl);
              removeChild(modalEl, documentBody);
          }
          zoomImgEl = undefined;
          zoomEl = undefined;
          closeBtnEl = undefined;
          boundaryDivFirst = undefined;
          boundaryDivLast = undefined;
          modalEl = undefined;
          removeEventListener(SCROLL, handleScroll, scrollableEl);
          removeEventListener(KEYDOWN, handleDocumentKeyDown, document);
      };
      // END CLEANUP
      var handleOpenBtnClick = function (e) {
          e.preventDefault();
          if (onZoomChange) {
              onZoomChange(true);
          }
          if (!isControlled) {
              zoom();
          }
      };
      var handleCloseBtnClick = function (e) {
          e.preventDefault();
          if (onZoomChange) {
              onZoomChange(false);
          }
          if (!isControlled) {
              unzoom();
          }
      };
      var handleFocusBoundaryDiv = function () {
          focus(closeBtnEl);
      };
      var handleResize = function () {
          if (state === State.LOADED) {
              setZoomImgStyle(true);
          }
          else {
              initImg();
          }
      };
      var handleZoomTransitionEnd = function () {
          focus(closeBtnEl);
      };
      var handleZoomImgLoad = function () {
          if (targetCloneEl) {
              targetCloneEl.style.visibility = 'hidden';
          }
          if (modalEl) {
              modalEl.style.backgroundColor = overlayBgColorEnd;
          }
          if (zoomImgEl) {
              removeEventListener(LOAD, handleZoomImgLoad, zoomImgEl);
              addEventListener(TRANSITIONEND, handleZoomTransitionEnd, zoomImgEl);
              setAttribute(STYLE, styleZoomed, zoomImgEl);
          }
          if (zoomEl) {
              addEventListener(TRANSITIONEND, handleZoomTransitionEnd, zoomEl);
              setAttribute(STYLE, styleZoomed, zoomEl);
          }
          setState(State.LOADED);
      };
      var handleUnzoomTransitionEnd = function () {
          if (!targetCloneEl)
              return;
          targetCloneEl.style.visibility = '';
          // timeout for Safari flickering issue
          window.setTimeout(function () {
              cleanupZoom();
              focus(openBtnEl);
              setState(State.UNLOADED);
          }, 0);
      };
      var handleModalClick = function () {
          if (onZoomChange) {
              onZoomChange(false);
          }
          if (!isControlled) {
              unzoom();
          }
      };
      var handleScroll = function () {
          if (onZoomChange) {
              onZoomChange(false);
          }
          if (!isControlled) {
              unzoom();
          }
      };
      var handleDocumentKeyDown = function (e) {
          if (isEscapeKey(e)) {
              e.stopPropagation();
              if (onZoomChange) {
                  onZoomChange(false);
              }
              if (!isControlled) {
                  unzoom();
              }
          }
      };
      var setState = function (s) {
          state = s;
          setZoomImgStyle();
      };
      var setZoomImgStyle = function (instant) {
          if (instant === void 0) { instant = false; }
          if (!targetCloneEl)
              return;
          var el = isImg ? zoomImgEl : zoomEl;
          if (el) {
              setAttribute(STYLE, getZoomImgStyle(instant ? ZERO_MS : transitionDuration, zoomMargin, targetCloneEl, isImg, state), el);
          }
      };
      var zoom = function () {
          if (isImg) {
              zoomImg();
          }
          else {
              zoomNonImg();
          }
          blur(openBtnEl);
          ariaHideOtherContent();
      };
      var zoomImg = function () {
          if (!targetCloneEl || state !== State.UNLOADED)
              return;
          var targetAlt = targetCloneEl.alt;
          var targetLabel = getAttribute(ARIA_LABEL, targetCloneEl);
          var targetLabelledBy = getAttribute(ARIA_LABELLEDBY, targetCloneEl);
          var targetSizes = targetCloneEl.sizes;
          var targetSrc = targetCloneEl.src;
          var targetSrcset = targetCloneEl.srcset;
          boundaryDivFirst = createElement(DIV);
          setAttribute(TABINDEX, '0', boundaryDivFirst);
          addEventListener(FOCUS, handleFocusBoundaryDiv, boundaryDivFirst);
          boundaryDivLast = createElement(DIV);
          setAttribute(TABINDEX, '0', boundaryDivLast);
          addEventListener(FOCUS, handleFocusBoundaryDiv, boundaryDivLast);
          closeBtnEl = createElement(BUTTON);
          setAttribute(STYLE, styleZoomBtnOut, closeBtnEl);
          setAttribute(ARIA_LABEL, closeText, closeBtnEl);
          addEventListener(CLICK, handleCloseBtnClick, closeBtnEl);
          zoomImgEl = new Image();
          addEventListener(LOAD, handleZoomImgLoad, zoomImgEl);
          setAttribute(DATA_RMIZ_ZOOMED, '', zoomImgEl);
          setAttribute(STYLE, styleZoomStart, zoomImgEl);
          if (targetAlt)
              zoomImgEl.alt = targetAlt;
          if (targetSrc)
              zoomImgEl.src = targetSrc;
          if (targetSrcset)
              zoomImgEl.srcset = targetSrcset;
          if (targetSizes)
              zoomImgEl.sizes = targetSizes;
          if (targetLabel)
              setAttribute(ARIA_LABEL, targetLabel, zoomImgEl);
          if (targetLabelledBy) {
              setAttribute(ARIA_LABELLEDBY, targetLabelledBy, zoomImgEl);
          }
          modalEl = createModal();
          appendChild(boundaryDivFirst, modalEl);
          appendChild(closeBtnEl, modalEl);
          appendChild(zoomImgEl, modalEl);
          appendChild(boundaryDivLast, modalEl);
          appendChild(modalEl, documentBody);
          addEventListener(KEYDOWN, handleDocumentKeyDown, document);
          addEventListener(SCROLL, handleScroll, scrollableEl);
      };
      var zoomNonImg = function () {
          if (!targetEl || state !== State.UNLOADED)
              return;
          boundaryDivFirst = createElement(DIV);
          setAttribute(TABINDEX, '0', boundaryDivFirst);
          addEventListener(FOCUS, handleFocusBoundaryDiv, boundaryDivFirst);
          boundaryDivLast = createElement(DIV);
          setAttribute(TABINDEX, '0', boundaryDivLast);
          addEventListener(FOCUS, handleFocusBoundaryDiv, boundaryDivLast);
          closeBtnEl = createElement(BUTTON);
          setAttribute(STYLE, styleZoomBtnOut, closeBtnEl);
          setAttribute(ARIA_LABEL, closeText, closeBtnEl);
          addEventListener(CLICK, handleCloseBtnClick, closeBtnEl);
          zoomEl = createElement(DIV);
          setAttribute(DATA_RMIZ_ZOOMED, '', zoomEl);
          setAttribute(STYLE, styleZoomStart, zoomEl);
          var cloneEl = targetEl.cloneNode(true);
          removeAttribute(ID, cloneEl);
          removeAttribute(TABINDEX, cloneEl);
          if (originalRole) {
              setAttribute(ROLE, originalRole, cloneEl);
          }
          else {
              removeAttribute(ROLE, cloneEl);
          }
          addEventListener(CLICK, handleCloseBtnClick, zoomEl);
          appendChild(cloneEl, zoomEl);
          modalEl = createModal();
          appendChild(boundaryDivFirst, modalEl);
          appendChild(closeBtnEl, modalEl);
          appendChild(zoomEl, modalEl);
          appendChild(boundaryDivLast, modalEl);
          appendChild(modalEl, documentBody);
          addEventListener(KEYDOWN, handleDocumentKeyDown, document);
          addEventListener(SCROLL, handleScroll, scrollableEl);
          handleZoomImgLoad();
      };
      var createModal = function () {
          var el = createElement(DIV);
          setAttribute(ARIA_LABEL, modalText, el);
          setAttribute(ARIA_MODAL, TRUE_STR, el);
          setAttribute(DATA_RMIZ_OVERLAY, '', el);
          setAttribute(ROLE, DIALOG, el);
          setAttribute(STYLE, getStyleOverlay(overlayBgColorStart, transitionDuration, String(zoomZindex)), el);
          addEventListener(CLICK, handleModalClick, el);
          return el;
      };
      var ariaHideOtherContent = function () {
          forEachSibling(function (el) {
              var ariaHiddenValue = el.getAttribute('aria-hidden');
              if (ariaHiddenValue) {
                  ariaHiddenSiblings.push([el, ariaHiddenValue]);
              }
              el.setAttribute('aria-hidden', 'true');
          }, documentBody);
      };
      var ariaResetOtherContent = function () {
          forEachSibling(function (el) {
              el.removeAttribute('aria-hidden');
          }, documentBody);
          ariaHiddenSiblings.forEach(function (_a) {
              var el = _a[0], ariaHiddenValue = _a[1];
              el === null || el === void 0 ? void 0 : el.setAttribute('aria-hidden', ariaHiddenValue);
          });
          ariaHiddenSiblings = [];
      };
      var unzoom = function () {
          if (state === State.LOADED) {
              var el = isImg ? zoomImgEl : zoomEl;
              if (el) {
                  blur(el);
                  addEventListener(TRANSITIONEND, handleUnzoomTransitionEnd, el);
              }
              if (modalEl) {
                  modalEl.style.backgroundColor = overlayBgColorStart;
              }
          }
          if (state !== State.UNLOADED) {
              setState(State.UNLOADING);
          }
          ariaResetOtherContent();
      };
      init();
      return { cleanup: cleanup, update: update };
  };
  //
  // STYLING
  //
  var styleAllDirsZero = 'top:0;right:0;bottom:0;left:0;';
  var stylePosAbsolute = 'position:absolute;';
  var stylePosRelative = 'position:relative;';
  var styleVisibilityHidden = 'visibility:hidden;';
  var styleWidth100pct = 'width:100%;';
  var styleWrap = stylePosRelative +
      'display:inline-flex;' +
      'align-items:flex-start;';
  var styleWrapDiv = styleWrap + styleWidth100pct;
  var styleCursorZoomIn = 'cursor:-webkit-zoom-in;cursor:zoom-in;';
  var styleCursorZoomOut = 'cursor:-webkit-zoom-out;cursor:zoom-out;';
  var styleZoomBtn = stylePosAbsolute +
      styleAllDirsZero +
      'background:none;' +
      'border:none;' +
      'margin:0;' +
      'padding:0;';
  var styleZoomBtnIn = styleZoomBtn + styleCursorZoomIn;
  var styleZoomBtnOut = styleZoomBtn + styleCursorZoomOut;
  var styleZoomed = stylePosAbsolute +
      '-webkit-transition-property:-webkit-transform;' +
      'transition-property:-webkit-transform;' +
      '-o-transition-property:transform;' +
      'transition-property:transform;' +
      'transition-property:transform,-webkit-transform;' +
      '-webkit-transform-origin:center center;' +
      '-ms-transform-origin:center center;' +
      'transform-origin:center center;';
  var styleZoomStart = styleZoomed + styleVisibilityHidden;
  var getStyleOverlay = function (backgroundColor, transitionDuration, zIndex) {
      return 'position:fixed;' +
          styleAllDirsZero +
          styleWidth100pct +
          'height:100%;' +
          '-webkit-transition-property:background-color;' +
          '-o-transition-property:background-color;' +
          'transition-property:background-color;' +
          ("background-color:" + backgroundColor + ";") +
          ("transition-duration:" + transitionDuration + ";") +
          'transition-timing-function:cubic-bezier(0.2,0,0.2,1);' +
          ("z-index:" + zIndex + ";");
  };
  var getZoomImgStyleStr = function (height, width, left, top, transform, transitionDuration) {
      return styleZoomed +
          ("height:" + height + "px;") +
          ("width:" + width + "px;") +
          ("left:" + left + "px;") +
          ("top:" + top + "px;") +
          ("-webkit-transform:" + transform + ";") +
          ("transform:" + transform + ";") +
          ("-webkit-transition-duration:" + transitionDuration + ";") +
          ("transition-duration:" + transitionDuration + ";") +
          'transition-timing-function:ease;';
  };
  var getZoomImgStyle = function (transitionDuration, zoomMargin, targetEl, isImg, state) {
      if (!targetEl) {
          return getZoomImgStyleStr(0, 0, 0, 0, 'none', ZERO_MS);
      }
      var _a = targetEl.getBoundingClientRect(), height = _a.height, left = _a.left, top = _a.top, width = _a.width;
      var originalTransform = targetEl.style.transform;
      if (state !== State.LOADED) {
          var initTransform = 'scale(1) translate(0,0)' +
              (originalTransform ? " " + originalTransform : '');
          return getZoomImgStyleStr(height, width, left, top, initTransform, transitionDuration);
      }
      var _b = targetEl, naturalHeight = _b.naturalHeight, naturalWidth = _b.naturalWidth;
      // Get amount to scale item
      var scale = isImg && naturalHeight && naturalWidth
          ? getMaxDimensionScale(height, width, zoomMargin, naturalHeight, naturalWidth)
          : getScale(height, width, zoomMargin);
      // Get the the coords for center of the viewport
      var viewportX = window.innerWidth / 2;
      var viewportY = window.innerHeight / 2;
      // Get the coords for center of the parent item
      var childCenterX = left + width / 2;
      var childCenterY = top + height / 2;
      // Get offset amounts for item coords to be centered on screen
      var translateX = (viewportX - childCenterX) / scale;
      var translateY = (viewportY - childCenterY) / scale;
      // Build transform style, including any original transform
      var transform = "scale(" + scale + ") translate(" + translateX + "px," + translateY + "px)" +
          (originalTransform ? " " + originalTransform : '');
      return getZoomImgStyleStr(height, width, left, top, transform, transitionDuration);
  };
  var isEscapeKey = function (e) { return e.key === 'Escape' || e.keyCode === 27; };
  var getScale = function (height, width, zoomMargin) {
      var scaleX = window.innerWidth / (width + zoomMargin);
      var scaleY = window.innerHeight / (height + zoomMargin);
      return Math.min(scaleX, scaleY);
  };
  var getMaxDimensionScale = function (height, width, zoomMargin, naturalHeight, naturalWidth) {
      var scale = getScale(naturalHeight, naturalWidth, zoomMargin);
      var ratio = naturalWidth > naturalHeight ? naturalWidth / width : naturalHeight / height;
      return scale > 1 ? ratio : scale * ratio;
  };
  var SVG_REGEX = /\.svg$/i;
  var appendChild = function (child, parent) { return parent.appendChild(child); };
  var removeChild = function (child, parent) {
      if (child && parent) {
          parent.removeChild(child);
      }
  };
  var createElement = function (type) { return document.createElement(type); };
  var blur = function (el) {
      if (el) {
          el.blur();
      }
  };
  var focus = function (el) {
      if (el) {
          el.focus({ preventScroll: true });
      }
  };
  var forEachSibling = function (handler, target) {
      var _a;
      var nodes = ((_a = target.parentNode) === null || _a === void 0 ? void 0 : _a.children) || [];
      for (var i = 0; i < nodes.length; i++) {
          var el = nodes[i];
          if (!el)
              return;
          var tagName = el.tagName;
          if (tagName === 'SCRIPT' ||
              tagName === 'NOSCRIPT' ||
              tagName === 'STYLE' ||
              el === target) {
              return;
          }
          handler(el);
      }
  };
  var replaceChild = function (parentNode, oldChild, newChild) {
      if (parentNode && oldChild && newChild) {
          parentNode.replaceChild(newChild, oldChild);
      }
  };
  var addEventListener = function (type, cb, el) {
      el.addEventListener(type, cb);
  };
  var removeEventListener = function (type, handler, el) {
      el.removeEventListener(type, handler);
  };
  var getAttribute = function (attr, el) { return el.getAttribute(attr); };
  var removeAttribute = function (attr, el) { return el.removeAttribute(attr); };
  var setAttribute = function (attr, value, el) {
      return el.setAttribute(attr, value);
  };

  return ImageZoom;

}());