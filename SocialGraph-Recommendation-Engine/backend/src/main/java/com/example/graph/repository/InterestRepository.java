package com.example.graph.repository;

import com.example.graph.model.Interest;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InterestRepository extends Neo4jRepository<Interest, String> {
}
