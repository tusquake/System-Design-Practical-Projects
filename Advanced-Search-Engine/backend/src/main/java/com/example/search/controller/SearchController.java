package com.example.search.controller;

import com.example.search.model.Product;
import com.example.search.repository.ProductRepository;
import com.example.search.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/search")
@CrossOrigin(origins = "*")
public class SearchController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SearchService searchService;

    // Ingestion API: Add a new product to the index
    @PostMapping("/products")
    public Product addProduct(@RequestBody Product product) {
        System.out.println("DEBUG: Received product: " + product);
        // Automatically populate the suggest field for autocomplete
        product.setSuggest(new org.springframework.data.elasticsearch.core.suggest.Completion(new String[]{product.getName()}));
        return productRepository.save(product);
    }

    // Autocomplete API
    @GetMapping("/autocomplete")
    public List<String> autocomplete(@RequestParam String query) {
        return searchService.fetchSuggestions(query);
    }

    // Basic Search: Simple match
    @GetMapping("/basic")
    public List<Product> basicSearch(@RequestParam String query) {
        return productRepository.findByNameContaining(query);
    }

    // Advanced Search: Typo tolerant
    // Returns a list of hit maps so the frontend can access content + highlightFields
    @GetMapping("/fuzzy")
    public List<Map<String, Object>> fuzzySearch(@RequestParam String query) {
        SearchHits<Product> hits = searchService.fuzzySearch(query);
        return toHitList(hits);
    }

    // Multi-Field Search with Facets: Name + Description + Category Counts
    @GetMapping("/multi")
    public Map<String, Object> multiSearch(@RequestParam String query) {
        SearchHits<Product> hits = searchService.searchWithFacets(query);
        return Map.of(
            "searchHits", toHitList(hits),
            "totalHits",  hits.getTotalHits(),
            "aggregations", extractCategories(hits)
        );
    }

    // Geo-Search API
    @GetMapping("/near-me")
    public List<Product> geoSearch(@RequestParam double lat, @RequestParam double lon, @RequestParam String distance) {
        return searchService.geoSearch(lat, lon, distance);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private List<Map<String, Object>> toHitList(SearchHits<Product> hits) {
        return hits.getSearchHits().stream()
                .map(hit -> Map.<String, Object>of(
                        "content",         hit.getContent(),
                        "highlightFields", hit.getHighlightFields()
                ))
                .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractCategories(SearchHits<Product> hits) {
        if (hits.getAggregations() == null) return List.of();
        
        org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations aggregations = 
            (org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations) hits.getAggregations();
        
        org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation aggregation = aggregations.get("categories");
        if (aggregation == null) return List.of();

        return aggregation.aggregation().getAggregate().sterms().buckets().array().stream()
                .map(bucket -> Map.<String, Object>of(
                        "key", bucket.key().stringValue(),
                        "docCount", bucket.docCount()
                ))
                .collect(Collectors.toList());
    }
}
