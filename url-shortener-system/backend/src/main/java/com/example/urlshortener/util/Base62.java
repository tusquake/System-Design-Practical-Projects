package com.example.urlshortener.util;

public class Base62 {
    private static final String ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int BASE = ALPHABET.length();

    /**
     * Encodes a numeric ID into a Base62 string.
     */
    public static String encode(long num) {
        StringBuilder sb = new StringBuilder();
        if (num == 0) return String.valueOf(ALPHABET.charAt(0));
        
        while (num > 0) {
            sb.append(ALPHABET.charAt((int) (num % BASE)));
            num /= BASE;
        }
        return sb.reverse().toString();
    }

    /**
     * Decodes a Base62 string back into a numeric ID.
     */
    public static long decode(String str) {
        long num = 0;
        for (int i = 0; i < str.length(); i++) {
            num = num * BASE + ALPHABET.indexOf(str.charAt(i));
        }
        return num;
    }
}
