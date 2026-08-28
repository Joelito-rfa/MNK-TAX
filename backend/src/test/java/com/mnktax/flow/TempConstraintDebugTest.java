package com.mnktax.flow;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;

@SpringBootTest
@ActiveProfiles("test")
class TempConstraintDebugTest {

    @Autowired
    private DataSource dataSource;

    @Test
    void diagnoseReceiptUnique() throws Exception {
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement()) {
            try (ResultSet rs = st.executeQuery("SELECT * FROM INFORMATION_SCHEMA.INDEXES")) {
                ResultSetMetaData md = rs.getMetaData();
                int nameCol = -1, tableCol = -1, uniqCol = -1;
                for (int i = 1; i <= md.getColumnCount(); i++) {
                    String n = md.getColumnName(i).toUpperCase();
                    if (n.contains("INDEX_NAME") || n.equals("NAME")) nameCol = i;
                    if (n.equals("TABLE_NAME")) tableCol = i;
                    if (n.contains("NON_UNIQUE") || n.contains("IS_UNIQUE") || n.contains("UNIQUE")) uniqCol = i;
                }
                System.out.println("[cols] name=" + nameCol + " table=" + tableCol + " uniq=" + uniqCol);
                while (rs.next()) {
                    String tbl = tableCol > 0 ? rs.getString(tableCol) : "?";
                    if (tbl != null && tbl.toLowerCase().contains("receipt")) {
                        System.out.println("[I] table=" + tbl
                                + " index=" + (nameCol > 0 ? rs.getString(nameCol) : "?")
                                + " uniq=" + (uniqCol > 0 ? rs.getString(uniqCol) : "?"));
                    }
                }
            }
        }
    }
}
