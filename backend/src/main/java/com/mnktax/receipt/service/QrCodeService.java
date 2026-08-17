package com.mnktax.receipt.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@Service
public class QrCodeService {

    public Path generate(String content, int size, Path targetDir) throws Exception {
        Files.createDirectories(targetDir);
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size,
                Map.of(EncodeHintType.MARGIN, 1));
        Path file = targetDir.resolve("qr_" + Math.abs(content.hashCode()) + ".png");
        MatrixToImageWriter.writeToPath(matrix, "PNG", file);
        return file;
    }
}
