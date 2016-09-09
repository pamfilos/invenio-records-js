/*
 * This file is part of Invenio.
 * Copyright (C) 2016 CERN.
 *
 * Invenio is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 2 of the
 * License, or (at your option) any later version.
 *
 * Invenio is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Invenio; if not, write to the Free Software Foundation, Inc.,
 * 59 Temple Place, Suite 330, Boston, MA 02111-1307, USA.
 *
 * In applying this license, CERN does not
 * waive the privileges and immunities granted to it by virtue of its status
 * as an Intergovernmental Organization or submit itself to any jurisdiction.
 */

/**
  * @ngdoc controller
  * @name InvenioRecordsCtrl
  * @namespace InvenioRecordsCtrl
  * @description
  *    Invenio records controller.
  */
function InvenioRecordsCtrl($scope, $rootScope, $q, $window, $location,
    $timeout, InvenioRecordsAPI) {

  // Parameters

  // Assign the controller to `vm`
  var vm = this;

  // The request args
  vm.invenioRecordsArgs = {
    url: '/',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // The form model
  vm.invenioRecordsModel = null;
  // Set endpoints
  vm.invenioRecordsEndpoints = null;

  // Record Loading - If the invenioRecords has the state loading
  vm.invenioRecordsLoading = true;

  // Record Alerts - if the invenioRecords has any alert
  vm.invenioRecordsAlert = null;

  ////////////

  // Functions

  /**
    * Set record schema.
    * @memberof InvenioRecordsCtrl
    * @functioninvenioRecordsSetSchema
    */
  function invenioRecordsSetSchema(response) {
    vm.invenioRecordsSchema = response.data;
  }

  /**
    * Set form schema.
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsSetForm
    */
  function invenioRecordsSetForm(response) {
    vm.invenioRecordsForm = response.data;
  }

  /**
    * Initialize the controller
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsInit
    * @param {Object} evt - The event object.
    * @param {Object} args - The invenio records arguments.
    * @param {Object} endpoints - The invenio endpoints for actions.
    * @param {Object} record - The record object.
    * @param {Object} links - The record action links.
    */
  function invenioRecordsInit(evt, args, endpoints, record, links) {
    // Start loading
    $rootScope.$broadcast('invenio.records.loading.start');
    // Assign the model
    vm.invenioRecordsModel = angular.copy(record);
    // Assign the args
    vm.invenioRecordsArgs = angular.merge(
      {},
      vm.invenioRecordsArgs,
      args
    );
    // Assign endpoints
    vm.invenioRecordsEndpoints = angular.merge(
      {},
      endpoints
    );

    if (Object.keys(links).length > 0) {
      $rootScope.$broadcast(
        'invenio.records.endpoints.updated', links
      );
    }

    // Get the schema and the form
    $q.all([
      InvenioRecordsAPI.get(vm.invenioRecordsEndpoints.schema)
        .then(invenioRecordsSetSchema),
      InvenioRecordsAPI.get(vm.invenioRecordsEndpoints.form)
        .then(invenioRecordsSetForm)
    ]).then(function() {
      // Remove loading state
      $rootScope.$broadcast('invenio.records.loading.stop');
    });
  }

  /**
    * Request an upload
    * @memberof InvenioFilesCtrl
    * @function upload
    */
  function getEndpoints(){
    var deferred = $q.defer();
    if (angular.isUndefined(vm.invenioRecordsEndpoints.self)) {
      // If the action url doesnt exists request it
      InvenioRecordsAPI.request({
        method: 'POST',
        url: vm.invenioRecordsEndpoints.initialization,
        data: {
          '$schema': vm.invenioRecordsEndpoints.schema
        },
        headers: vm.invenioRecordsArgs.headers || {}
      }).then(function success(response) {
        // Upadate the endpoints
        $rootScope.$broadcast(
          'invenio.records.endpoints.updated', response.data.links
        );
        deferred.resolve({});
      }, function error(response) {
        // Error
        deferred.reject(response);
      });
    } else {
      // We already have it resolve it asap
      deferred.resolve({});
    }
    return deferred.promise;
  }


  /**
    * Remove any empty values from the data
    * @memberof InvenioRecordsCtrl
    * @function defaultDataPrepare
    * @param {Object} data - Provided by ``extra-params.data``.
    * @param {Object} unwanted - A list with unwanted values.
    *
    */
  function removeEmptyValues(data, unwanted) {
    var _unwantend = unwanted || [[null], [{}], '', [undefined]];
    angular.forEach(data, function(value, key) {
      angular.forEach(_unwantend, function(_value) {
        if (angular.equals(_value, value))  {
          delete data[key];
        }
      });
    });
    return data;
  }

  /**
    * The data preparation before make a request
    * @memberof InvenioRecordsCtrl
    * @function defaultRequestPrepare
    * @param {Object} url - The request url.
    * @param {Object} method - The request method.
    * @param {Object} model -The data model.
    * @param {Object} extraParams - Provided by ``extra-params``.
    *
    */
  function defaultRequestPrepare(url, method, model, extraParams) {
    // Clean the model
    var _model = removeEmptyValues(model) || {};
    // Pass all the data information
    var _data = angular.merge(
      {},
      extraParams.data || {},
      {
        '$schema': vm.invenioRecordsEndpoints.schema
      },
      _model
    );
    return {
      url: url,
      method: (method || 'PUT').toUpperCase(),
      data: _data,
      headers: extraParams.headers || {}
    };
  }

  /**
    * Make the API request with the _data payload
    * @memberof InvenioRecordsCtrl
    * @function makeActionRequest
    * @param {String} type - The action type (any existing key from ``links``).
    * @param {String} method - The method (POST, PUT, DELETE).
    */
  function makeActionRequest(type, method) {
    var request = (vm.requestPrepare || defaultRequestPrepare)
      .call(this,
        vm.invenioRecordsEndpoints[type],
        method,
        vm.invenioRecordsModel,
        vm.invenioRecordsArgs
      );
    return InvenioRecordsAPI.request(request);
  }

  /**
    * Handle the redirection after a success action if needed
    * @memberof InvenioRecordsCtrl
    * @function handleActionRedirection
    * @param {String} redirect_path - The url to redirect on success.
    */
  function handleActionRedirection(redirect_path) {
    // Redirect if defined
    if (!angular.isUndefined(redirect_path) && redirect_path !== '') {
      // Redirect to new location
      var _url = redirect_path;
      if (redirect_path.substr(0, 1) !== '/' && redirect_path.substr(0, 4) !== 'http') {
        // Find the url
        _url = vm.invenioRecordsEndpoints[redirect_path];
      }
      $window.location.href = _url;
    }
  }

  /**
    * Action handler
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsHandler
    * @param {Array} actions - Actions array [[type, method]].
    * @param {String} redirect_path - The url to redirect on success.
    */
  function invenioRecordsHandler(actions, redirect_path) {

    var _actions = (typeof(actions[0]) === 'string') ? [actions] : actions;
    /**
      * After a successful request
      * @memberof invenioRecordsHandler
      * @function actionSuccessful
      * @param {Object} responses - The promise action request responses.
      */
    function actionSuccessful(responses) {
      // NOTE: We keep only the response of the last action!!
      var response = responses[responses.length - 1] || {};

      $rootScope.$broadcast('invenio.records.alert', {
        type: 'success',
        data: response.data,
        action: _actions
      });
      // Update the endpoints
      if (!angular.isUndefined(response.data.links)){
        $rootScope.$broadcast(
          'invenio.records.endpoints.updated', response.data.links
        );
      }

      // Trigger successful event for action
      $rootScope.$broadcast('invenio.records.action.success', _actions);

      // Stop loadig idicator
      $rootScope.$broadcast('invenio.records.loading.stop');

      // Redirect if defined
      handleActionRedirection(redirect_path || undefined);
    }
    /**
      * After an errored request
      * @memberof invenioRecordsHandler
      * @function actionErrored
      * @param {Object} response - The action request response.
      */
    function actionErrored(response) {
      $rootScope.$broadcast('invenio.records.alert', {
        type: 'danger',
        data: response.data,
      });

      if (response.data.status === 400 && response.data.errors) {
        var deferred = $q.defer();
        var promise = deferred.promise;
        promise.then(function displayValidationErrors() {
          angular.forEach(response.data.errors, function(value) {
            try {
              $scope.$broadcast(
                'schemaForm.error.' + value.field.replace('metadata.', ''),
                'backendValidationError',
                value.message
              );
            } catch(error) {
              $scope.$broadcast(
                'schemaForm.error.' + value.field,
                'backendValidationError',
                value.message
              );
            }
          });
        }).then(function stopLoading() {
          $rootScope.$broadcast('invenio.records.loading.stop');
        });
        deferred.resolve();
      } else {
        $rootScope.$broadcast('invenio.records.loading.stop');
      }
      // Trigger successful event for action
      $rootScope.$broadcast('invenio.records.action.error', response.data);
    }

    // Start loading
    $rootScope.$broadcast('invenio.records.loading.start');

    // Get the endpoints and do the request
    getEndpoints().then(
      function() {
        var promises = [];
        angular.forEach(_actions, function(action, index) {
          this.push(
            makeActionRequest(action[0], action[1])
          );
        }, promises);
        $q.all(promises).then(
          actionSuccessful,
          actionErrored
        );
      },
      actionErrored
    );
  }

  /**
    * Remove validation error
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsRemoveValidation
    * @param {Object} fieldValue - The filed value.
    * @param {Object} form - The form object.
    */
  function invenioRecordsRemoveValidation(fieldValue, form) {
    // Reset validation only if the filed has been changed
    if (form.validationMessage) {
      // If the field has changed remove the error
      $scope.$broadcast(
        'schemaForm.error.' + form.key.join('.'),
        'backendValidationError',
        true
      );
    }
  }

  /**
    * Change the state to loading
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsLoadingStart
    * @param {Object} evt - The event object.
    */
  function invenioRecordsLoadingStart(evt) {
    // Set the state to loading
    vm.invenioRecordsLoading = true;
  }

  /**
    * Change the state to normal
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsLoadingStop
    * @param {Object} evt - The event object.
    */
  function invenioRecordsLoadingStop(evt) {
    // Set the state to normal
    vm.invenioRecordsLoading = false;
  }

  /**
    * Show alert messages
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsAlert
    * @param {Object} evt - The event object.
    * @param {Object} data - The object with the alert data.
    */
  function invenioRecordsAlert(evt, data) {
    // Reset the error
    vm.invenioRecordsAlert = null;
    // Attach the error to the scope
    $timeout(function() {
      vm.invenioRecordsAlert = data;
    }, 0);
  }

  /**
    * Prepare the form after the action
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsActionFinished
    * @param {Object} evt - The event object.
    * @param {Object} types - The action types.
    */
  function invenioRecordsActionSuccess(evt, types) {
    // Set the form to pristine if it's self or publish
    var _types = [];
    // Get all the types requested
    angular.forEach(types, function(item, index) {
      this.push(item[0]);
    }, _types);
    // Change the form state
    if (_types.indexOf('self') > -1) {
      $scope.depositionForm.$setPristine();
    } else if (_types.indexOf('publish') > -1) {
      $scope.depositionForm.$setPristine();
      $scope.depositionForm.$setSubmitted();
    }
  }

  /**
    * Updating the endpoints
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsEndpointsUpdated
    * @param {Object} evt - The event object.
    * @param {Object} endpoints - The object with the endpoints.
    */
  function invenioRecordsEndpointsUpdated(evt, endpoints) {
    vm.invenioRecordsEndpoints = angular.merge(
      {},
      vm.invenioRecordsEndpoints,
      endpoints
    );
    // Update the location
    $rootScope.$broadcast(
      'invenio.records.location.updated', endpoints
    );
  }

  /**
    * Updating the location with the new ``pid``
    * @memberof InvenioRecordsCtrl
    * @function invenioRecordsLocationUpdated
    * @param {Object} evt - The event object.
    * @param {Object} endpoints - The object with the endpoints.
    */
  function invenioRecordsLocationUpdated(evt, endpoints) {
    // Change the location only if html exists
    if (!angular.isUndefined(endpoints.html)) {
      // ¯\_(ツ)_/¯ https://github.com/angular/angular.js/issues/3924
      var parser = document.createElement('a');
      parser.href = endpoints.html;
      $location.url(parser.pathname);
      $location.replace();
    }
  }


  // Attach fuctions to the scope

  // Action handler
  vm.actionHandler = invenioRecordsHandler;
  // Remove validation
  vm.removeValidationMessage = invenioRecordsRemoveValidation;
  // Remove empty values
  vm.removeEmptyValues = removeEmptyValues;
  // Prepare for action request
  vm.defaultRequestPrepare = defaultRequestPrepare;

  ////////////

  // Listener

  // Local

  // When the module initialized
  $scope.$on('invenio.records.init', invenioRecordsInit);

  // Global - Until a unified invenio angular module

  // When there is an error
  $rootScope.$on('invenio.records.alert', invenioRecordsAlert);

  // When loading requested to start
  $rootScope.$on('invenio.records.loading.start', invenioRecordsLoadingStart);
  // When loading requested to stop
  $rootScope.$on('invenio.records.loading.stop', invenioRecordsLoadingStop);

  // When the ``public`` action finishes without errors
  $rootScope.$on(
    'invenio.records.action.success', invenioRecordsActionSuccess
  );

  // Update endpoints
  $rootScope.$on(
    'invenio.records.endpoints.updated', invenioRecordsEndpointsUpdated
  );

  // Update location
  $rootScope.$on(
    'invenio.records.location.updated', invenioRecordsLocationUpdated
  );
}

// Inject depedencies
InvenioRecordsCtrl.$inject = [
  '$scope',
  '$rootScope',
  '$q',
  '$window',
  '$location',
  '$timeout',
  'InvenioRecordsAPI',
];

angular.module('invenioRecords.controllers')
  .controller('InvenioRecordsCtrl', InvenioRecordsCtrl);
