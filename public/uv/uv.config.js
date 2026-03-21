self.__uv$config = {
    prefix: '/service/',
    bare: '/bare/',
    encodeUrl: function(url) {
        if (!url) return url;
        return Ultraviolet.codec.xor.encode(url);
    },
    decodeUrl: function(url) {
        if (!url) return url;
        return Ultraviolet.codec.xor.decode(url);
    },
    handler: '/uv/uv.handler.js',
    client: '/uv/uv.client.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    sw: '/uv/uv.sw.js',
};
