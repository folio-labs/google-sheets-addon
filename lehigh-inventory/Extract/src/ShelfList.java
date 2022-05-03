
import java.io.FileNotFoundException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.vufind.util.DeweyCallNormalizer;



public class ShelfList {
	
	public static void main(String[] args) throws ClassNotFoundException, SQLException, UnsupportedEncodingException, FileNotFoundException {
		
		DeweyCallNormalizer normalizer = new DeweyCallNormalizer();
		
		String dburl = "localhost";
		String dbport = "1234";
		String dbname = "lehigh_prod";
		String dbuser = "lehigh_ldp";
		String dbpassword = "redacted";
		//will query call number like '10%' -- anything starting with 10
		//can contain several ranges like {"10","20"}
		String[] callNumbers = {"10"};
		
		Class.forName("org.postgresql.Driver");
		String url = "jdbc:postgresql://" + dburl + ":" + dbport + "/" + dbname + "?user=" + dbuser + "&password=" + dbpassword;
		Connection conn = DriverManager.getConnection(url);
		Statement st = conn.createStatement();
		
		for (String callNo : callNumbers) {
		
			String query ="select code,title,call_number,item_level_call_number,item_level_call_number_prefix,name,barcode, material_type_id," +
					" public.inventory_items.data->'effectiveCallNumberComponents'->>'callNumber' as dataCallNumber," +
					" public.inventory_items.data->'effectiveCallNumberComponents'->>'prefix' as dataCallNumberPrefix " + 
					" from public.inventory_holdings  as holding" + 
					" join public.inventory_items on public.inventory_items.holdings_record_id = holding.id\r\n" + 
					" join public.inventory_instances on holding.instance_id = public.inventory_instances.id" +
					" join public.inventory_locations on holding.permanent_location_id = public.inventory_locations.id" +
					" WHERE call_number like '" + callNo + "%'" + 
					" AND library_id = 'de919b54-25b4-4ef8-9aaa-5be8faa6f107' " + 
					"  and public.inventory_items.discovery_suppress = false";
					
	
			ResultSet rs = st.executeQuery(query);
			while (rs.next()) {
				
				//ROOM USE MATERIAL IS UUID c85e9a9c-45e7-4605-a7b7-7a82576e1f9f
				String materialType = rs.getString("material_type_id");
				if (materialType.equalsIgnoreCase("c85e9a9c-45e7-4605-a7b7-7a82576e1f9f")) continue;  //don't include it in the sheet
				
				String barcode = rs.getString("barcode");
				String callNumber = rs.getString("call_number");
				String itemLevelCallNumber = rs.getString("item_level_call_number");
				String callNumberPrefix = rs.getString("item_level_call_number_prefix");
				String dataCallNumberPrefix = rs.getString("dataCallNumberPrefix");
				String dataCallNumber = rs.getString("dataCallNumber");
				//TRY ITEM TABLE TO PULL TOGETHER THE CALL NUMBER
				String callNumberToUse = itemLevelCallNumber;
				if (callNumberPrefix != null && !callNumberPrefix.isEmpty()) {
					callNumberToUse = callNumberPrefix + " " + itemLevelCallNumber;
				}
				//IF IT'S NULL TRY TO PULL IT OUT OF THE JSON DATA
				if (callNumberToUse == null || callNumberToUse.isEmpty()) {
					if (dataCallNumberPrefix != null && !dataCallNumberPrefix.isEmpty()) {
						callNumberToUse = dataCallNumberPrefix + " " + dataCallNumber;
					}
					else {
						callNumberToUse = dataCallNumber;
					}
				}
				if (callNumberToUse == null || callNumberToUse.trim().isEmpty()) callNumberToUse = callNumber;
				String location = rs.getString("code");
				String title = rs.getString("title");
				String locationName = rs.getString("name");
				String normCallNo = new String(normalizer.normalize(callNumberToUse), StandardCharsets.UTF_8);
				
				
				System.out.println(barcode + "~" + normCallNo + "~" + callNumberToUse + "~ on shelf~item status~major~minor~spine~" + title);
			}
			
		}
		
		conn.close();
		
		
	}

}
