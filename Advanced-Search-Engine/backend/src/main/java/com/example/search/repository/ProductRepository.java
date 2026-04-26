package com.example.search.repository;

import com.example.search.model.Product;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import java.util.List;

public interface ProductRepository extends ElasticsearchRepository<Product, String> {
    
    // Spring Data automatically converts this into an Elasticsearch "Match" query
    List<Product> findByNameContaining(String name);
    
    List<Product> findByCategory(String category);
}
