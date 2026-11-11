package com.mnktax.common.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

public final class ReferenceGenerator {

    private ReferenceGenerator() {
    }

    private static final String[] PREFIXES = {
            "DEC", "ASS", "DEB", "PAY", "REC", "COL", "NOT"
    };

    public static String next(String prefix) {
        if (prefix.length() > 6) {
            prefix = prefix.substring(0, 6);
        }
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        // Suffixe large : la création en lot (imports, tests, campagnes) doit
        // rester unique dans la même seconde — 4 chiffres provoquaient des
        // collisions sur l'index unique des références.
        String rand = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        return prefix + "-" + ts + "-" + rand;
    }

    public static String uuid() {
        return UUID.randomUUID().toString();
    }

    public static String documentRef(String prefix) {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String rand = String.format("%06d", ThreadLocalRandom.current().nextInt(1000000));
        return prefix + "/" + date + "/" + rand;
    }
}
