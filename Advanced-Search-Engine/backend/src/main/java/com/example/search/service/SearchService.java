package com.example.search.service;

import com.example.search.model.Product;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.query.Query;
import org.springframework.data.elasticsearch.core.query.StringQuery;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SearchService {

    @Autowired
    private ElasticsearchOperations elasticsearchOperations;

    /**
     * Fuzzy Search: Finds products even with typos!
     */
    public org.springframework.data.elasticsearch.core.SearchHits<Product> fuzzySearch(String query) {
        String fuzzyJson = "{ \"query\": { \"fuzzy\": { \"name\": { \"value\": \"" + query + "\", \"fuzziness\": \"AUTO\" } } }, " +
                           "\"highlight\": { \"fields\": { \"name\": {}, \"description\": {} } } }";
        Query searchQuery = new StringQuery(fuzzyJson);

        return elasticsearchOperations.search(searchQuery, Product.class);
    }

    /**
     * Multi-Match Search with Aggregations: Searches across BOTH name and description
     * and returns category counts.
     */
    public org.springframework.data.elasticsearch.core.SearchHits<Product> searchWithFacets(String query) {
        String facetJson = "{ \"query\": { \"multi_match\": { \"query\": \"" + query + "\", \"fields\": [\"name^3\", \"description\"] } }, " +
                           "\"highlight\": { \"fields\": { \"name\": {}, \"description\": {} } }, " +
                           "\"aggs\": { \"categories\": { \"terms\": { \"field\": \"category\" } } } }";
        Query searchQuery = new StringQuery(facetJson);

        return elasticsearchOperations.search(searchQuery, Product.class);
    }

    /**
     * Autocomplete: Suggests product names as the user types
     */
    public List<String> fetchSuggestions(String query) {
        String suggestJson = "{ \"suggest\": { \"product-suggest\": { \"prefix\": \"" + query + "\", \"completion\": { \"field\": \"suggest\" } } } }";
        Query searchQuery = new StringQuery(suggestJson);

        SearchHits<Product> searchHits = elasticsearchOperations.search(searchQuery, Product.class);
        
        // Extract the suggested text from the hits
        return searchHits.get()
                .map(hit -> hit.getContent().getName())
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * Geo-Search: Finds products within a certain distance from a location
     */
    public List<Product> geoSearch(double lat, double lon, String distance) {
        String geoJson = "{ \"query\": { \"bool\": { \"must\": { \"match_all\": {} }, \"filter\": { \"geo_distance\": { \"distance\": \"" + distance + "\", \"location\": { \"lat\": " + lat + ", \"lon\": " + lon + " } } } } } }";
        Query searchQuery = new StringQuery(geoJson);

        SearchHits<Product> searchHits = elasticsearchOperations.search(searchQuery, Product.class);
        return searchHits.get().map(SearchHit::getContent).collect(Collectors.toList());
    }
}
