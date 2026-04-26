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
    public List<Product> fuzzySearch(String query) {
        // Build the fuzzy query as a JSON string for simplicity and power
        String fuzzyJson = "{ \"fuzzy\": { \"name\": { \"value\": \"" + query + "\", \"fuzziness\": \"AUTO\" } } }";
        Query searchQuery = new StringQuery(fuzzyJson);

        SearchHits<Product> searchHits = elasticsearchOperations.search(searchQuery, Product.class);
        return searchHits.get().map(SearchHit::getContent).collect(Collectors.toList());
    }

    /**
     * Multi-Match Search: Searches across BOTH name and description
     */
    public List<Product> multiMatchSearch(String query) {
        String multiMatchJson = "{ \"multi_match\": { \"query\": \"" + query + "\", \"fields\": [\"name\", \"description\"] } }";
        Query searchQuery = new StringQuery(multiMatchJson);

        SearchHits<Product> searchHits = elasticsearchOperations.search(searchQuery, Product.class);
        return searchHits.get().map(SearchHit::getContent).collect(Collectors.toList());
    }
}
