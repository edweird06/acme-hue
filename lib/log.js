
module.exports = function (request, message) {
    message = message || '';
    if(request) {
        const method = request.method;
        var origin = request.get('host');
        var forwardedFor = request.headers['x-forwarded-for'];
        if (forwardedFor) {
            message = `${forwardedFor} ${method} ${request.originalUrl}: ${message}`;
        } else if (origin) {
            message = `${origin} ${method} ${request.originalUrl}: ${message}`;
        } else {
            message = `${request.get('host')} ${method} ${request.originalUrl}: ${message}`;
        }
    }
    console.log(message);
};