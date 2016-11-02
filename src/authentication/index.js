var urljoin = require('url-join');

var RequestBuilder = require('../helper/request-builder');
var qsBuilder = require('../helper/qs-builder');
var objectHelper = require('../helper/object');
var assert = require('../helper/assert');
var responseHandler = require('../helper/response-handler');

var PasswordlessAuthentication = require('./passwordless-authentication');
var DBConnection = require('./db-connection');

function Authentication(options) {
  /* eslint-disable */
  assert.check(options, { type: 'object', message: 'options parameter is not valid' }, {
    domain: { type: 'string', message: 'domain option is required' },
    client_id: { type: 'string', message: 'client_id option is required' },
    response_type: { optional: true, type: 'string', message: 'response_type is not valid' },
    redirect_uri: { optional: true, type: 'string', message: 'redirect_uri is not valid' },
    _sendTelemetry: { optional: true, type: 'boolean', message: '_sendTelemetry option is not valid' },
    _telemetryInfo: { optional: true, type: 'object', message: '_telemetryInfo option is not valid' }
  });

  options._sendTelemetry = options._sendTelemetry === false ? options._sendTelemetry : true;
  /* eslint-enable */

  this.request = new RequestBuilder(options);
  this.baseOptions = options;
  this.baseOptions.rootUrl = 'https://' + this.baseOptions.domain;

  this.passwordless = new PasswordlessAuthentication(options);
  this.dbConnection = new DBConnection(options);
}

Authentication.prototype.buildAuthorizeUrl = function (options) {
  var params;
  var qs;

  assert.check(options, {
    optional: true,
    type: 'object',
    message: 'options parameter is not valid'
  });

  params = objectHelper.merge(this.baseOptions, [
    'client_id',
    'response_type',
    'redirect_uri'
  ]).with(options || {});

  // eslint-disable-next-line
  if (this.baseOptions._sendTelemetry) {
    params.auth0Client = this.request.getTelemetryData();
  }

  qs = qsBuilder(params);

  return urljoin(this.baseOptions.rootUrl, 'authorize', '?' + qs);
};

Authentication.prototype.buildLogoutUrl = function (options) {
  var params;
  var qs;

  assert.check(options, {
    optional: true,
    type: 'object',
    message: 'options parameter is not valid'
  });

  params = objectHelper.merge(this.baseOptions, ['client_id'])
                .with(options || {});

  // eslint-disable-next-line
  if (this.baseOptions._sendTelemetry) {
    params.auth0Client = this.request.getTelemetryData();
  }

  qs = qsBuilder(params);

  return urljoin(this.baseOptions.rootUrl, 'v2', 'logout', '?' + qs);
};

Authentication.prototype.ro = function (options, cb) {
  var url;
  var body;

  assert.check(options, { type: 'object', message: 'options parameter is not valid' }, {
    username: { type: 'string', message: 'username option is required' },
    password: { type: 'string', message: 'password option is required' },
    connection: { type: 'string', message: 'connection option is required' },
    scope: { type: 'string', message: 'scope option is required' }
  });
  assert.check(cb, { type: 'function', message: 'cb parameter is not valid' });

  url = urljoin(this.baseOptions.rootUrl, 'oauth', 'ro');

  body = objectHelper.merge(this.baseOptions, ['client_id'])
                .with(options);

  body.grant_type = body.grant_type || 'password';

  this.request
    .post(url)
    .send(body)
    .end(responseHandler(cb));
};

Authentication.prototype.userInfo = function (accessToken, cb) {
  var url;

  assert.check(accessToken, { type: 'string', message: 'accessToken parameter is not valid' });
  assert.check(cb, { type: 'function', message: 'cb parameter is not valid' });

  url = urljoin(this.baseOptions.rootUrl, 'userinfo');

  this.request
    .get(url)
    .set('Authorization', 'Bearer ' + accessToken)
    .end(responseHandler(cb));
};

Authentication.prototype.delegation = function (options, cb) {
  var url;
  var body;

  assert.check(options, { type: 'object', message: 'options parameter is not valid' }, {
    grant_type: { type: 'string', message: 'grant_type option is required' }
  });
  assert.check(cb, { type: 'function', message: 'cb parameter is not valid' });

  url = urljoin(this.baseOptions.rootUrl, 'delegation');

  body = objectHelper.merge(this.baseOptions, ['client_id'])
                .with(options);

  this.request
    .post(url)
    .send(body)
    .end(responseHandler(cb));
};

module.exports = Authentication;