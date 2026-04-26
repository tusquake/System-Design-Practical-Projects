local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2]) -- tokens per millisecond
local requested = 1

-- Get Redis time (seconds, microseconds)
local redis_time = redis.call('TIME')
local now = (tonumber(redis_time[1]) * 1000) + (tonumber(redis_time[2]) / 1000)

-- Get current bucket state
local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if tokens == nil then
    -- First time: Start with capacity minus the requested token
    tokens = capacity - requested
    last_refill = now
else
    -- Calculate refill since last request
    local time_passed = math.max(0, now - last_refill)
    local refill = time_passed * refill_rate
    tokens = math.min(capacity, tokens + refill)
    
    -- Consume token
    if tokens >= requested then
        tokens = tokens - requested
        last_refill = now
    else
        -- Not enough tokens!
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        return -1
    end
end

-- Save and return
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
redis.call('EXPIRE', key, 60)
return math.floor(tokens)
